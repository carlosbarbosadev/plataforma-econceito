const db = require('../db');
const { fetchPedidosVendas, refreshBlingAccessToken, fetchTodosOsContatos, fetchDetalhesContato, fetchDetalhesPedidoVenda } = require('./bling');
const axios = require('axios');
const { fetchProdutos } = require('./bling');

const UMA_HORA_EM_MS = 60 * 60 * 1000;


async function sincronizarClientes() {
    console.log(`[GERAL] Iniciando sincronização de todos os clientes...`);
    try {
        const listaDeContatosBasicos = await fetchTodosOsContatos();

        if (listaDeContatosBasicos.length === 0) {
            console.log('[GERAL] Nenhum cliente encontrado na conta do Bling.');
            return;
        }

        console.log(`[GERAL] Total de ${listaDeContatosBasicos.length} clientes encontrados. Buscando detalhes e salvando...`);

        await db.query('TRUNCATE TABLE cache_clientes RESTART IDENTITY');
        let clientesSalvos = 0;

        for (const contatoBasico of listaDeContatosBasicos) {
            try {
                const clienteDetalhado = await fetchDetalhesContato(contatoBasico.id);

                await new Promise(resolve => setTimeout(resolve, 350));

                const insertQuery = `
                    INSERT INTO cache_clientes (
                        id, nome, fantasia, tipo_pessoa, documento, ie_rg,
                        endereco, numero, bairro, cidade, uf, cep,
                        fone, email, vendedor_id
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (id) DO UPDATE SET
                        nome = EXCLUDED.nome, fantasia = EXCLUDED.fantasia, tipo_pessoa = EXCLUDED.tipo_pessoa,
                        documento = EXCLUDED.documento, ie_rg = EXCLUDED.ie_rg, endereco = EXCLUDED.endereco,
                        numero = EXCLUDED.numero, bairro = EXCLUDED.bairro, cidade = EXCLUDED.cidade,
                        uf = EXCLUDED.uf, cep = EXCLUDED.cep, fone = EXCLUDED.fone, email = EXCLUDED.email,
                        vendedor_id = EXCLUDED.vendedor_id, updated_at = NOW()
                `;

                const params = [
                    clienteDetalhado.id,
                    clienteDetalhado.nome,
                    clienteDetalhado.fantasia || null,
                    clienteDetalhado.tipo,
                    clienteDetalhado.numeroDocumento || null,
                    clienteDetalhado.ie || clienteDetalhado.rg || null,
                    clienteDetalhado.endereco?.geral?.endereco || null,
                    clienteDetalhado.endereco?.geral?.numero || null,
                    clienteDetalhado.endereco?.geral?.bairro || null,
                    clienteDetalhado.endereco?.geral?.municipio || null,
                    clienteDetalhado.endereco?.geral?.uf || null,
                    clienteDetalhado.endereco?.geral?.cep || null,
                    clienteDetalhado.telefone || clienteDetalhado.celular || null,
                    clienteDetalhado.email || null,
                    clienteDetalhado.vendedor?.id || null
                ];
                await db.query(insertQuery, params);
                clientesSalvos++;

                if (clientesSalvos % 20 === 0) {
                    console.log(`... ${clientesSalvos} de ${listaDeContatosBasicos.length} clientes salvos no cache.`);
                }

            } catch (error) {
                console.error(`--> Erro ao processar o cliente ID ${contatoBasico.id}. Pulando. Erro: ${error.message}`);
            }
        }
        console.log(`[GERAL] Sincronizados ${clientesSalvos} de ${listaDeContatosBasicos.length} clientes com sucesso.`);

    } catch (error) {
        console.error(`[GERAL] Erro grave ao sincronizar clientes:`, error.message);
    } 
}

async function atualizarMetricas() {
    console.log('Calculando e atualizando a tabela de métricas (cache_metricas)...');

    const { rows: dadosDaView } = await db.query('SELECT * FROM vw_dashboard_dados');

    if (dadosDaView.length === 0) {
        console.log('Nenhum dado de métrica para atualizar.');
        return;
}

    for (const metrica of dadosDaView) {
        const upsertMetricasQuery = `
            INSERT INTO cache_metricas (
                vendedor_id, mes, ano, vendas_mes, vendas_ano,
                pedidos_concluidos, pedidos_abertos
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (vendedor_id, mes, ano) DO UPDATE SET
                vendas_mes = EXCLUDED.vendas_mes,
                vendas_ano = EXCLUDED.vendas_ano,
                pedidos_concluidos = EXCLUDED.pedidos_concluidos,
                pedidos_abertos = EXCLUDED.pedidos_abertos,
                updated_at = CURRENT_TIMESTAMP;
        `;

        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        const params = [
            metrica.vendedor_id,
            mesAtual,
            anoAtual,
            metrica.vendas_mes,
            metrica.vendas_ano,
            metrica.pedidos_mes,
            metrica.pedidos_abertos,
        ];

        await db.query(upsertMetricasQuery, params);
    }
    console.log(`Métricas para ${dadosDaView.length} vendedor(es) atualizadas.`);
}

async function atualizarProdutosMaisVendidos() {
    console.log('Calculando e atualizando a tabela de produtos mais vendidos...');

    await db.query('TRUNCATE TABLE cache_produtos_mais_vendidos RESTART IDENTITY');

    const { rows: produtosDaView } = await db.query('SELECT * FROM vw_produtos_mais_vendidos');

    if (produtosDaView.length === 0) {
        console.log('Nenhum dado de produto para atualizar.');
        return;
    }

    let ranking = 1;
    for (const produto of produtosDaView) {
        const insertQuery = `
            INSERT INTO cache_produtos_mais_vendidos (
                vendedor_id, produto_nome, total_vendido, ranking, periodo_inicio, periodo_fim
            ) VALUES ($1, $2, $3, $4, $5, $6);
        `;

        const hoje = new Date();
        const umAnoAtras = new Date();
        umAnoAtras.setFullYear(hoje.getFullYear() - 1);

        const params = [
            produto.vendedor_id,
            produto.produto_nome,
            produto.total_quantidade,
            ranking++,
            umAnoAtras.toISOString().split('T')[0], // Formato YYYY-MM-DD
            hoje.toISOString().split('T')[0], // Formato YYYY-MM-DD
        ];
        await db.query(insertQuery, params);
    }
    console.log(`${produtosDaView.length} produto(s) mais vendido(s) atualizado(s).`);
}

async function sincronizarDadosDeUmVendedor(idVendedor) {
    console.log(`--- Iniciando sincronização para o vendedor ID: ${idVendedor} ---`);
    const startTime = new Date();

    try {
        await db.query(`
            INSERT INTO cache_sync_control (vendedor_id, ultima_sincronizacao, status) VALUES ($1, $2, 'sincronizando')
            ON CONFLICT (vendedor_id) DO UPDATE SET ultima_sincronizacao = $2, status = 'sincronizando', erro_mensagem = NULL
        `, [idVendedor, startTime]);

        const listaDePedidos = await fetchPedidosVendas(idVendedor);
        console.log(`[Vendedor ${idVendedor}] Encontrados ${listaDePedidos.length} pedidos na API.`);
        
        let pedidosSalvos = 0;

        if (listaDePedidos.length > 0) {
            for (const pedidoInfo of listaDePedidos) {
                try {
                    const pedidoDetalhado = await fetchDetalhesPedidoVenda(pedidoInfo.id);
                    await new Promise(resolve => setTimeout(resolve, 350));

                    const upsertPedidoQuery = `INSERT INTO cache_pedidos (id, numero, data_pedido, data_saida, total, total_produtos, status_id, status_nome, cliente_id, cliente_nome, cliente_documento, vendedor_id, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO UPDATE SET numero = EXCLUDED.numero, data_pedido = EXCLUDED.data_pedido, data_saida = EXCLUDED.data_saida, total = EXCLUDED.total, total_produtos = EXCLUDED.total_produtos, status_id = EXCLUDED.status_id, status_nome = EXCLUDED.status_nome, cliente_id = EXCLUDED.cliente_id, cliente_nome = EXCLUDED.cliente_nome, cliente_documento = EXCLUDED.cliente_documento, vendedor_id = EXCLUDED.vendedor_id, observacoes = EXCLUDED.observacoes, updated_at = CURRENT_TIMESTAMP;`;
                    const pedidoParams = [pedidoDetalhado.id, pedidoDetalhado.numero, pedidoDetalhado.data, pedidoDetalhado.dataSaida || null, pedidoDetalhado.total, pedidoDetalhado.totalProdutos, pedidoDetalhado.situacao.id, pedidoDetalhado.situacao.valor, pedidoDetalhado.contato.id, pedidoDetalhado.contato.nome, pedidoDetalhado.contato.numeroDocumento || null, pedidoDetalhado.vendedor?.id || null, pedidoDetalhado.observacoes || null];
                    await db.query(upsertPedidoQuery, pedidoParams);

                    const deleteItensQuery = 'DELETE FROM cache_pedido_itens WHERE pedido_id = $1';
                    await db.query(deleteItensQuery, [pedidoDetalhado.id]);

                    if (pedidoDetalhado.itens && pedidoDetalhado.itens.length > 0) {
                        for (const item of pedidoDetalhado.itens) {
                            const insertItemQuery = `INSERT INTO cache_pedido_itens (pedido_id, produto_id, produto_codigo, produto_nome, quantidade, valor_unitario, valor_total) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
                            const itemParams = [pedidoDetalhado.id, item.produto.id, item.codigo, item.descricao, item.quantidade, item.valor, (item.quantidade * item.valor)];
                            await db.query(insertItemQuery, itemParams);
                        }
                    }

                    pedidosSalvos++;

                } catch (error) {
                    console.error(`Erro ao processar o pedido ID ${pedidoInfo.id}. Pulando para o próximo. Erro: ${error.message}`);
            }
        }    
    } 

        const endTime = new Date();
        const executionTime = Math.round((endTime - startTime) / 1000);

        await db.query(`UPDATE cache_sync_control SET status = 'completo', total_pedidos = $1, tempo_execucao = $2, erro_mensagem = NULL WHERE vendedor_id = $3`, [listaDePedidos.length, executionTime, idVendedor]);
        console.log(`--- Sincronização para o Vendedor ID ${idVendedor} concluída com sucesso. ---`);
    } catch (error) {
        console.error(`Erro grave durante a sincronização do Vendedor ID ${idVendedor}:`, error.message);
        await db.query(`UPDATE cache_sync_control SET status = 'erro', erro_mensagem = $1 WHERE vendedor_id = $2`, [error.message, idVendedor]);
    }
}

async function iniciarSincronizacaoGeral() {
    console.log('====================================================');
    console.log('INICIANDO ROTINA GERAL DE SINCRONIZAÇÃO...');
    
    try {
        const { rows: vendedores } = await db.query("SELECT id_vendedor_bling FROM usuarios WHERE tipo_usuario = 'vendedor' AND id_vendedor_bling IS NOT NULL");
        console.log(`Encontrados ${vendedores.length} vendedores para sincronizar.`);

        for (const vendedor of vendedores) {
            await sincronizarDadosDeUmVendedor(vendedor.id_vendedor_bling);
        }

        await sincronizarClientes();

        await atualizarMetricas();
        await atualizarProdutosMaisVendidos();

    } catch (error) {
        console.error('ERRO CRÍTICO na rotina de sincronização geral:', error.message);
    }

    console.log('ROTINA GERAL DE SINCRONIZAÇÃO FINALIZADA.');
    console.log('====================================================');
}

async function sincronizarProdutos() {
    console.log(`[GERAL] Iniciando sincronização de produtos...`);
    try {
        const produtosDaApi = await fetchProdutos();

        if (!produtosDaApi || produtosDaApi.length === 0) {
            console.log('[GERAL] Nenhum produto encontrado na API do Bling para sincronizar.');
            return;
        }

        console.log(`[GERAL] ${produtosDaApi.length} produtos recebidos da API. Salvando no banco de dados...`);

        let produtosSalvos = 0;
        for (const produto of produtosDaApi) {
            const upsertQuery = `
                INSERT INTO cache_produtos (
                    id, nome, codigo, preco, estoque_saldo_virtual, situacao, imagem_url, dados_completos_json, atualizado_em
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    nome = EXCLUDED.nome,
                    codigo = EXCLUDED.codigo,
                    preco = EXCLUDED.preco,
                    estoque_saldo_virtual = EXCLUDED.estoque_saldo_virtual,
                    situacao = EXCLUDED.situacao,
                    imagem_url = EXCLUDED.imagem_url,
                    dados_completos_json = EXCLUDED.dados_completos_json,
                    atualizado_em = NOW();
            `;

            const params = [
                produto.id,
                produto.nome,
                produto.codigo,
                produto.preco,
                produto.estoque?.saldoVirtualTotal || 0,
                produto.situacao,
                produto.imagemURL,
                produto,
            ];

            await db.query(upsertQuery, params);
            produtosSalvos++;
        }

        console.log(`[GERAL] Cache de ${produtosSalvos} produtos atualizado com sucesso.`);

    } catch (error) {
        console.error(`[GERAL] Falha CRÍTICA ao sincronizar produtos:`, error.message);
    }
}

function iniciarSincronizacaoAgendada() {
    console.log('Agendamento da sincronização de PRODUTOS ativado. A rotina rodará a cada 1 hora.');
    
    sincronizarProdutos();
    setInterval(sincronizarProdutos, UMA_HORA_EM_MS);
}

module.exports = {
    iniciarSincronizacaoGeral,
    iniciarSincronizacaoAgendada
};