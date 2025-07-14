const axios = require('axios');
const db = require('../db');
const { fetchPedidosVendas, refreshBlingAccessToken } = require('./bling');

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

async function fetchDetalhesPedido(pedidoId) {
    const accessToken = process.env.BLING_ACCESS_TOKEN;
    const url = `https://api.bling.com.br/Api/v3/pedidos/vendas/${pedidoId}`;

    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        return response.data.data;    
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.warn(`Token expirado ao buscar detalhes do pedido ${pedidoId}. Tentando renovar...`);
            await refreshBlingAccessToken();
            const newAccessToken = process.env.BLING_ACCESS_TOKEN;
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${newAccessToken}` },
            });
            return response.data.data;
        }
        console.error(`Erro ao buscar detalhes do pedido ${pedidoId}:`, error.message);
        throw error;
    }
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
        const inserQuery = `
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
        await db.query(inserQuery, params);
    }
    console.log(`${produtosDaView.length} produto(s) mais vendido(s) atualizado(s).`);
}

async function sincronizarDadosDoBling() {
    console.log('==============================');
    console.log('INICIANDO PROCESSO COMPLETO DE SINCRONIZAÇÃO...');
    const idVendedor = process.env.ID_VENDEDOR_BLING_TESTE;
    const startTime = new Date();

    if (!idVendedor) {
        console.error('ERRO CRÍTICO: ID_VENDEDOR_BLING_TESTE não definido no arquivo .env');
        return;
    }

    try {
        const listaDePedidos = await fetchPedidosVendas(idVendedor);

        if (listaDePedidos.length === 0) {
            console.log('Nenhum pedido encontrado no Bling para sincronizar.');
            console.log('Processo de sincronização finalizado.');
            console.log('==============================');
            return;
        }

        console.log(`\nIniciando a fase de salvamento de ${listaDePedidos.length} pedidos e seus itens no banco de dados...`);
        let pedidosSalvos = 0;

        for (const pedidoInfo of listaDePedidos) {
            const pedidoDetalhado = await fetchDetalhesPedido(pedidoInfo.id);
            await new Promise(resolve => setTimeout(resolve, 350));
            const upsertPedidoQuery = `
                INSERT INTO cache_pedidos (
                    id, numero, data_pedido, data_saida, total, total_produtos,
                    status_id, status_nome, cliente_id, cliente_nome, cliente_documento,
                    vendedor_id, observacoes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (id) DO UPDATE SET
                    numero = EXCLUDED.numero,
                    data_pedido = EXCLUDED.data_pedido,
                    data_saida = EXCLUDED.data_saida,
                    total = EXCLUDED.total,
                    total_produtos = EXCLUDED.total_produtos,
                    status_id = EXCLUDED.status_id,
                    status_nome = EXCLUDED.status_nome,
                    cliente_id = EXCLUDED.cliente_id,
                    cliente_nome = EXCLUDED.cliente_nome,
                    cliente_documento = EXCLUDED.cliente_documento,
                    vendedor_id = EXCLUDED.vendedor_id,
                    observacoes = EXCLUDED.observacoes,
                    updated_at = CURRENT_TIMESTAMP;
            `;

            const params = [
                pedidoDetalhado.id,
                pedidoDetalhado.numero,
                pedidoDetalhado.data,
                pedidoDetalhado.dataSaida || null,
                pedidoDetalhado.total,
                pedidoDetalhado.totalProdutos,
                pedidoDetalhado.situacao.id,
                pedidoDetalhado.situacao.valor,
                pedidoDetalhado.contato.id,
                pedidoDetalhado.contato.nome,
                pedidoDetalhado.contato.numeroDocumento || null,
                pedidoDetalhado.vendedor?.id || null,
                pedidoDetalhado.observacoes || null,
            ];
            await db.query(upsertPedidoQuery, params);

            const deleteItensQuery = 'DELETE FROM cache_pedido_itens WHERE pedido_id = $1';
            await db.query(deleteItensQuery, [pedidoDetalhado.id]);

            if (pedidoDetalhado && pedidoDetalhado.itens.length > 0) {
                for (const item of pedidoDetalhado.itens) {
                    const insertItemQuery = `
                        INSERT INTO cache_pedido_itens (
                            pedido_id, produto_id, produto_codigo, produto_nome,
                            quantidade, valor_unitario, valor_total
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7);
                    `;
                    const itemParams = [
                        pedidoDetalhado.id,
                        item.produto.id,
                        item.codigo,
                        item.descricao,
                        item.quantidade,
                        item.valor,
                        (item.quantidade * item.valor)
                    ];
                    await db.query(insertItemQuery, itemParams);
                }
            }

            pedidosSalvos++;
            if (pedidosSalvos % 20 === 0) {
                console.log(`... ${pedidosSalvos} de ${listaDePedidos.length} pedidos processados e salvos.`);
            }
        }

        console.log(`\n✅ Sincronização de ${pedidosSalvos} pedidos e seus itens concluída com sucesso!`);

        await atualizarMetricas();
        await atualizarProdutosMaisVendidos();

    } catch (error) {
        console.error('Ocorreu um erro grave durante a sincronização:', error.message, error.stack);
    }

    console.log('=====================================');
    console.log('PROCESSO DE SINCRONIZAÇÃO FINALIZADO');
    console.log('=====================================');
}

module.exports = {
    sincronizarDadosDoBling,
};