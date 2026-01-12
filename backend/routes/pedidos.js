const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const blingService = require('../services/bling')
const db = require('../db');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const { formatInTimeZone } = require('date-fns-tz');

const calcularParcelas = (formaPagamentoId, valorTotal) => {
    const regrasDeParcelamento = {
        3359853: [7],
        2076718: [30],
        2076727: [60],
        2076783: [30],
        7758544: [1],
        4421026: [7, 14],
        2076737: [28, 35],
        2091116: [30, 45],
        3514108: [30, 45, 60],
        2076738: [28, 35, 42],
        2076750: [30, 45, 60],
        2306222: [28, 35, 42, 49],
        2076765: [28, 35, 42, 49, 56],
        2127537: [1],
        7616572: [1],
    };

    const diasParaVencimentos = regrasDeParcelamento[formaPagamentoId];

    if (!diasParaVencimentos) {
        const hoje = new Date().toISOString().split('T')[0];
        return [{
            dataVencimento: hoje,
            valor: Number(valorTotal),
            formaPagamento: { id: Number(formaPagamentoId) }
        }];
    }

    const numeroDeParcelas = diasParaVencimentos.length;
    const valorPorParcela = numeroDeParcelas > 0 ? (valorTotal / numeroDeParcelas) : valorTotal;
    
    const parcelasCalculadas = diasParaVencimentos.map(dias => {
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + dias);

        const ano = dataVencimento.getFullYear();
        const mes = String(dataVencimento.getMonth() + 1).padStart(2, '0');
        const dia = String(dataVencimento.getDate()).padStart(2, '0');

        return {
            dataVencimento: `${ano}-${mes}-${dia}`,
            valor: parseFloat(valorPorParcela.toFixed(2)),
            formaPagamento: { id: Number(formaPagamentoId) }
        };
    });

    return parcelasCalculadas;
};

router.get('/', autenticarToken, async (req, res) => {
    console.log(`(OTIMIZADO) Rota GET /api/pedidos acessada por: ${req.usuario.email}`);
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;
        const termoBusca = req.query.search || '';
        const statusId = req.query.statusId || '';

        const queryParams = [];
        let paramIndex = 1;
        let whereClauses = [];

        if (req.usuario.tipo === 'vendedor') {
            whereClauses.push(`vendedor_id = $${paramIndex++}`);
            queryParams.push(req.usuario.id_vendedor_bling);
        }

        if (statusId) {
            whereClauses.push(`status_id = $${paramIndex++}`);
            queryParams.push(statusId);
        }

        if (termoBusca.trim()) {
            whereClauses.push(`(cliente_nome ILIKE $${paramIndex} OR numero::text ILIKE $${paramIndex})`);
            queryParams.push(`%${termoBusca}%`);
            paramIndex++;
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const totalQuery = `SELECT COUNT(*) FROM cache_pedidos ${whereString}`;
        const totalResult = await db.query(totalQuery, queryParams);
        const totalDeItens = parseInt(totalResult.rows[0].count, 10);

        const finalParams = [...queryParams, limit, offset];
        const pedidosQuery = `
            SELECT id, numero, TO_CHAR(data_pedido, 'DD/MM/YYYY') AS data_pedido, cliente_nome, total, status_id
            FROM cache_pedidos
            ${whereString}
            ORDER BY cache_pedidos.data_pedido DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const { rows: pedidosDaPagina } = await db.query(pedidosQuery, finalParams);

        const pedidosFormatados = pedidosDaPagina.map(p => ({
            ...p,
            total: parseFloat(p.total)
        }));

        res.json({ data: pedidosFormatados, total: totalDeItens, limit });

    } catch (error) {
        console.error(`Erro na rota /api/pedidos:`, error.message);
        res.status(500).json({ mensagem: `Falha ao buscar pedidos: ${error.message}` });
    }
});

router.post('/', autenticarToken, async (req, res) => {
    console.log(`Rota POST /api/pedidos (Dual Write) acessada por: ${req.usuario.email}`);

    try {
        const MAPA_VENDEDORES = {
            "15596296612": "15596336667", // Diogo Silva Guimarães
            "15596375075": "15596429451", // Rosana de Almeira Tavares
            "15596444660": "15596460068", // Rita de Cássia
            "15596444658": "15596459962", // Jean Charles
            "15596432168": "15596538397", // Aquila Cardoso
            "15596381239": "15596429455", // Maycon Junior
            "15596366972": "15596429449", // Rogério Aparecido
            "15596349291": "15596349303", // Rodrigo Pavan
            "15596335316": "15596337054", // Gircelio Tomas
            "15596297654": "15596337046", // Anderson Lima
            "15596224985": "15596227824", // Vera Lucia
            "15596092270": "15596200017", // José Ricardo
            "15596092267": "15596200019", // Rogério Ribeiro
            "15596046115": "15596200021", // Anselmo Ribeiro
            "15294368112": "15596200022", // Eduardo Safar
            "15259226712": "15596200023", // João Glauddios
            "15224192591": "15596200026", // Marijo Rodrigues
            "15224097835": "15596200034", // Sidma Regina
            "15224084996": "15596200043", // Carlos Eduardo
            "15218883077": "15596200045", // Mauricio
            "15218872916": "15596200048", // Pedro Magno
            "15218866887": "15596200050", // Marcelo Peixoto
            "15596598445": "15596704721", // José Nairton
            "15596582390": "15596840466", // João de Oliveira
        };

        const {
            idClienteBling,
            itensPedido,
            idFormaPagamentoBling,
            valorTotalPedido,
            observacoes,
            observacoesInternas,
            dataPedido
        } = req.body;

        if (!idClienteBling || !itensPedido || !Array.isArray(itensPedido) || itensPedido.length === 0) {
            return res.status(400).json({ mensagem: "ID do cliente e pelo menos um item são obrigatórios." });
        }
        if (!idFormaPagamentoBling || (valorTotalPedido === undefined || valorTotalPedido === null)) {
            return res.status(400).json({ mensagem: "Forma de pagamento e valor total são obrigatórios." });
        }
        if (!req.usuario.id_vendedor_bling && req.usuario.tipo === 'vendedor') {
            return res.status(403).json({ mensagem: 'ID de vendedor não configurado. Não é possível criar o pedido.' });
        }

        const parcelasParaBling = calcularParcelas(idFormaPagamentoBling, valorTotalPedido);
        const hoje = new Date().toISOString().split('T')[0];
        
        const pedidoBase = {
            data: dataPedido || hoje,
            dataSaida: dataPedido || hoje,
            contato: { id: Number(idClienteBling) },
            situacao: { id: 47722 },
            itens: itensPedido.map(item => ({
                produto: { id: Number(item.idProdutoBling) },
                quantidade: Number(item.quantidade),
                valor: Number(item.valorUnitario),
                codigo: item.codigo || undefined,
                descricao: item.descricao || undefined
            })),
            parcelas: parcelasParaBling,
            ...(req.usuario.id_vendedor_bling && {
                vendedor: { id: Number(req.usuario.id_vendedor_bling) }
            }),
            ...(observacoes && { observacoes: observacoes }),
            ...(observacoesInternas && { observacoesInternas: observacoesInternas }),
        };

        const statusEnvio = {
            conceitofestas: { sucesso: false, id: null, msg: '' },
            concept: { sucesso: false, id: null, msg: '' }
        };

        let pedidoDetalhado = null;

        console.log("--> Enviando para CONCEITOFESTAS...");
        let resultadoBlingPrincipal;
        
        try {
            resultadoBlingPrincipal = await blingService.criarPedidoVenda(pedidoBase, 'conceitofestas');
            
            statusEnvio.conceitofestas.sucesso = true;
            statusEnvio.conceitofestas.id = resultadoBlingPrincipal.data?.id;
            console.log('Sucesso na ConceitoFestas! ID:', statusEnvio.conceitofestas.id);

            if (resultadoBlingPrincipal.data?.id) {
                const novoPedidoId = resultadoBlingPrincipal.data.id;
                console.log(`Atualizando cache local...`);
                
                pedidoDetalhado = await blingService.fetchDetalhesPedidoVenda(novoPedidoId);

                const upsertQuery = `
                    INSERT INTO cache_pedidos (
                        id, numero, data_pedido, data_saida, total, total_produtos, status_id, status_nome,
                        cliente_id, cliente_nome, cliente_documento, vendedor_id, observacoes, observacoes_internas, updated_at, dados_completos_json
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15)
                    ON CONFLICT (id) DO UPDATE SET
                        numero = EXCLUDED.numero, data_pedido = EXCLUDED.data_pedido, data_saida = EXCLUDED.data_saida,
                        total = EXCLUDED.total, total_produtos = EXCLUDED.total_produtos, status_id = EXCLUDED.status_id,
                        status_nome = EXCLUDED.status_nome, cliente_id = EXCLUDED.cliente_id, cliente_nome = EXCLUDED.cliente_nome,
                        cliente_documento = EXCLUDED.cliente_documento, vendedor_id = EXCLUDED.vendedor_id,
                        observacoes = EXCLUDED.observacoes, observacoes_internas = EXCLUDED.observacoes_internas, updated_at = NOW(), dados_completos_json = EXCLUDED.dados_completos_json;
                `;

                const params = [
                    pedidoDetalhado.id, pedidoDetalhado.numero, pedidoDetalhado.data, pedidoDetalhado.dataSaida || null,
                    pedidoDetalhado.total, pedidoDetalhado.totalProdutos, pedidoDetalhado.situacao.id, pedidoDetalhado.situacao.valor,
                    pedidoDetalhado.contato.id, pedidoDetalhado.contato.nome, pedidoDetalhado.contato.numeroDocumento || null,
                    pedidoDetalhado.vendedor?.id || null, pedidoDetalhado.observacoes || null, pedidoDetalhado.observacoesInternas || null, pedidoDetalhado
                ];

                await db.query(upsertQuery, params);
            }

        } catch (error) {
            console.error('ERRO CRÍTICO na ConceitoFestas:', error.message);
            throw error; 
        }
        
        await sleep(2000);

        console.log("--> Enviando para CONCEPT...");
        
        try {
            if (!pedidoDetalhado) {
                 throw new Error("Não foi possível recuperar os detalhes do pedido da conta principal.");
            }

            const pedidoSecundario = JSON.parse(JSON.stringify(pedidoBase));
            const contatoResumido = pedidoDetalhado.contato;
            
            
            let docCliente = contatoResumido.numeroDocumento;
            
            let clienteCompletoOrigem = null;
            if (!docCliente) {
                 clienteCompletoOrigem = await blingService.fetchDetalhesContato(contatoResumido.id, 'conceitofestas');
                 docCliente = clienteCompletoOrigem.numeroDocumento;
            }

            const docLimpo = docCliente ? String(docCliente).replace(/\D/g, '') : null;
            
            if (!docLimpo) {
                throw new Error(`Cliente ${contatoResumido.nome} não possui CPF/CNPJ. Sincronização cancelada.`);
            }

            console.log(`Buscando cliente (Doc: ${docLimpo}) no banco local...`);
            const buscaDb = await db.query('SELECT id_concept FROM map_clientes_concept WHERE documento = $1', [docLimpo]);

            if (buscaDb.rows.length > 0) {
                const idEncontrado = buscaDb.rows[0].id_concept;
                console.log(`Cliente encontrado no CACHE LOCAL (DB). ID: ${idEncontrado}`);
                pedidoSecundario.contato.id = idEncontrado;
            
            } else {
                console.log(`Cliente não encontrado no DB Local. Iniciando cadastro na Concept...`);
                
                if (!clienteCompletoOrigem) {
                    clienteCompletoOrigem = await blingService.fetchDetalhesContato(contatoResumido.id, 'conceitofestas');
                }

                const dadosParaCriacao = { ...clienteCompletoOrigem };
                delete dadosParaCriacao.id; 
                delete dadosParaCriacao.codigo; 
                delete dadosParaCriacao.vendedor;

                let novoId = null;

                try {
                    console.log(`Tentando criar cliente na Concept...`);
                    const respostaCriacao = await blingService.criarClienteBling(dadosParaCriacao, 'concept');
                    novoId = respostaCriacao.data?.id || respostaCriacao.id;
                    console.log(`Cliente criado com sucesso! ID: ${novoId}`);

                } catch (erroCriacao) {
                    const msgErro = JSON.stringify(erroCriacao.response?.data || erroCriacao.message);
                    const erroDuplicidade = msgErro.includes("já existe") || msgErro.includes("cadastrado") || erroCriacao.response?.status === 422;

                    if (erroDuplicidade) {
                        console.log(`Cliente já existe na Concept. Tentando recuperar ID.`);
                        try {
                            const axios = require('axios');
                            const tokenConcept = await blingService.getAccessToken('concept');
                            const respBusca = await axios.get(`${process.env.BLING_API_V3_URL || 'https://api.bling.com.br/Api/v3'}/contatos`, {
                                headers: { 'Authorization': `Bearer ${tokenConcept}` },
                                params: { numero_documento: docLimpo }
                            });

                            if (respBusca.data?.data?.length > 0) {
                                novoId = respBusca.data.data[0].id;
                                console.log(`ID Recuperado via busca direta: ${novoId}`);
                            } else {
                                throw new Error("Cliente existe mas API não retornou ID na busca.");
                            }
                        } catch (e) {
                             console.error("Falha na recuperação:", e.message);
                             throw erroCriacao;
                        }
                    } else {
                        throw erroCriacao;
                    }
                }

                if (novoId) {
                    pedidoSecundario.contato.id = novoId;
                    try {
                        await db.query(`
                            INSERT INTO map_clientes_concept (documento, id_concept, nome)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (documento) DO UPDATE SET id_concept = EXCLUDED.id_concept;
                        `, [docLimpo, novoId, clienteCompletoOrigem.nome]);
                    } catch (dbError) { console.error("Erro cache DB:", dbError.message); }
                }
            }

            const idVendedorOrigem = String(req.usuario.id_vendedor_bling);
            
            if (idVendedorOrigem && MAPA_VENDEDORES[idVendedorOrigem]) {
                console.log(`Vendedor Traduzido: ${idVendedorOrigem} -> ${MAPA_VENDEDORES[idVendedorOrigem]}`);
                pedidoSecundario.vendedor = { 
                    id: Number(MAPA_VENDEDORES[idVendedorOrigem]) 
                };
            } else {
                console.log(`Vendedor ID ${idVendedorOrigem} sem mapeamento. Enviando sem vendedor.`);
                delete pedidoSecundario.vendedor;
            }

            delete pedidoSecundario.situacao;

            const ID_FORMA_PAGAMENTO_CONCEPT = 3514084; 
            pedidoSecundario.parcelas = pedidoSecundario.parcelas.map(p => ({
                ...p,
                formaPagamento: { id: ID_FORMA_PAGAMENTO_CONCEPT } 
            }));

            console.log("Iniciando Tradução de Produtos (SKU -> ID)");
            
            const itensTraduzidos = [];

            for (const itemReal of pedidoDetalhado.itens) {
                
                let sku = itemReal.produto?.codigo || itemReal.codigo;
                if (sku) sku = String(sku).trim();

                if (!sku) {
                    throw new Error(`Produto "${itemReal.descricao}" sem SKU na origem. Impossível sincronizar.`);
                }

                console.log(`Buscando ID na Concept para SKU: "${sku}"...`);

                const idProdutoConcept = await blingService.buscarIdProdutoPorSku(sku, 'concept');

                if (idProdutoConcept) {
                    console.log(`Encontrado! SKU "${sku}" = ID Concept ${idProdutoConcept}`);
                    
                    itensTraduzidos.push({
                        produto: { id: idProdutoConcept },
                        quantidade: Number(itemReal.quantidade),
                        valor: Number(itemReal.valor),
                        descricao: itemReal.descricao,
                        unidade: itemReal.unidade || 'UN',
                        tipo: 'P'
                    });

                } else {
                    throw new Error(`O produto SKU "${sku}" (${itemReal.descricao}) não foi encontrado na conta Concept. Cadastre-o lá com o mesmo código.`);
                }
                
                await new Promise(r => setTimeout(r, 200)); 
            }

            pedidoSecundario.itens = itensTraduzidos;

            const resultadoBlingSecundario = await blingService.criarPedidoVenda(pedidoSecundario, 'concept');
            
            statusEnvio.concept.sucesso = true;
            statusEnvio.concept.id = resultadoBlingSecundario.data?.id;
            console.log('Sucesso na Concept! ID:', statusEnvio.concept.id);

        } catch (error) {
            console.error('ALERTA: Falha na Concept:', error.message);
            if (error.response?.data) {
                console.error("Detalhe:", JSON.stringify(error.response.data, null, 2));
            }
            statusEnvio.concept.msg = error.response?.data?.error?.message || error.message;
        }

        res.status(201).json({ 
            mensagem: "Processamento concluído.", 
            status_envio: statusEnvio,
            data: resultadoBlingPrincipal.data
        });

    } catch (error) {
        console.error('Erro na rota POST:', error.message);
        if (!res.headersSent) {
            const status = error.response?.status || 500;
            res.status(status).json({ mensagem: error.message || "Erro desconhecido." });
        }
    }
});

router.get ('/:idPedidoVenda', autenticarToken, async(req, res) => {
    const { idPedidoVenda } = req.params;
    console.log(`Rota GET /api/pedidos/${idPedidoVenda} acessada por: ${req.usuario.email}`);

    if(!idPedidoVenda || isNaN(Number(idPedidoVenda))) {
        return res.status(400).json({ mensagem: "ID do Pedido inválido ou não fornecido." });
    }

    try {
        const detalhesDoPedido = await blingService.fetchDetalhesPedidoVenda(idPedidoVenda);

        if (detalhesDoPedido.itens && detalhesDoPedido.itens.length > 0) {
            const itensComEstoquePromises = detalhesDoPedido.itens.map(async (item) => {
                let estoqueDisponivel = 0;
                try {
                    const stockQuery = 'SELECT estoque_saldo_virtual FROM cache_produtos WHERE codigo = $1';
                    const stockResult = await db.query(stockQuery, [item.codigo]);
                    if (stockResult.rows.length > 0) {
                        estoqueDisponivel = parseFloat(stockResult.rows[0].estoque_saldo_virtual) || 0;
                    }
                } catch (stockError) {
                    console.error(`Erro ao buscar estoque para o item ${item.codigo}:`, stockError);
                }
                return { ...item, estoqueDisponivel };
            });

            detalhesDoPedido.itens = await Promise.all(itensComEstoquePromises);
        }

        const productionItemsQuery = 'SELECT product_code FROM production_items WHERE order_id = $1';
        const { rows: productionItems } = await db.query(productionItemsQuery, [idPedidoVenda]);

        const productionItemSet = new Set(productionItems.map(item => item.product_code));

        if (detalhesDoPedido.itens) {
            detalhesDoPedido.itens = detalhesDoPedido.itens.map(item => ({
                ...item,
                isForProduction: productionItemSet.has(item.codigo)
            }));
        }

        if (detalhesDoPedido.vendedor && detalhesDoPedido.vendedor.id) {
            const vendedorIdBling = detalhesDoPedido.vendedor.id;
            const queryVendedor = 'SELECT nome FROM usuarios WHERE id_vendedor_bling = $1';
            const resultVendedor = await db.query(queryVendedor, [vendedorIdBling]);

            if (resultVendedor.rows.length > 0) {
                detalhesDoPedido.vendedor_nome = resultVendedor.rows[0].nome; 
                console.log(`Nome do vendedor encontrado: ${detalhesDoPedido.vendedor_nome}`);
            } else {
                console.log(`Vendedor com ID Bling ${vendedorIdBling} não encontrado.`);
            }
        }

        try {
            const queryKanban = 'SELECT kanban_column, observacoes_expedicao, acknowledged FROM shipment_status WHERE order_id = $1';
            const resultKanban = await db.query(queryKanban, [idPedidoVenda]);

            if (resultKanban.rows.length > 0) {
                detalhesDoPedido.kanban_column = resultKanban.rows[0].kanban_column;
                detalhesDoPedido.observacoes_expedicao = resultKanban.rows[0].observacoes_expedicao || '';
                detalhesDoPedido.acknowledged = resultKanban.rows[0].acknowledged;
            } else {
                detalhesDoPedido.kanban_column = 'em-aberto';
                detalhesDoPedido.observacoes_expedicao = '';
                detalhesDoPedido.acknowledged = false;
            }

        } catch (dbError) {
            console.error('Erro ao buscar status do Kanban:', dbError);
            detalhesDoPedido.kanban_column = 'em-aberto';
            detalhesDoPedido.observacoes_expedicao = '';
        }

        if (req.usuario.tipo === 'vendedor') {
            if (!detalhesDoPedido.vendedor || Number(detalhesDoPedido.vendedor.id) != Number(req.usuario.id_vendedor_bling)) {
                console.warn(`Vendedor ${req.usuario.email} tentando acessar pedido ${idPedidoVenda} que não lhe pertence ou não tem vendedor definido.`);
                return res.status(403).json({ mensagem: "Você não tem permissão para ver os detalhes deste pedido." });
            }
        }

        console.log(`Retornando detalhes do pedido ID ${idPedidoVenda} para ${req.usuario.email}.`);
        res.json(detalhesDoPedido);

    } catch (error) {
        console.error(`Erro na rota GET /api/pedidos/${idPedidoVenda} para ${req.usuario.email}:`, error.message);
        if (!res.headersSent) {
            const status = error.message.includes("não encontrado") ? 404 : (error.response?.status || 500);
            res.status(status).json({ mensagem: `Falha ao buscar detalhes do pedido: ${error.message}` });

        }
    }
});

router.put('/:id', autenticarToken, async (req, res) => {
  const pedidoId = req.params.id;
  const pedidoEditadoDoFrontend = req.body;

  console.log(`Backend: Recebida requisição para ATUALIZAR o pedido ID: ${pedidoId}`);

  try {
    const selectQuery = 'SELECT status_id FROM cache_pedidos WHERE id = $1';
    const queryResult = await db.query(selectQuery, [pedidoId]);  

    if (queryResult.rows.length === 0) {
        return res.status(404).json({ mensagem: `Pedido ${pedidoId} não encontrado no cache local.` });
    }

    const statusIdAnterior = queryResult.rows[0].status_id;
    const statusIdNovo = pedidoEditadoDoFrontend.situacao.id;

    const ID_ORCAMENTO = 47722;
    const ID_EM_ABERTO = 6;

    const deveAtualizarData = statusIdAnterior === ID_ORCAMENTO && statusIdNovo === ID_EM_ABERTO;
    
    const payloadParaBling = {
        ...pedidoEditadoDoFrontend,
    };

    if (deveAtualizarData) {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        const dataFormatada = `${dia}/${mes}/${ano}`;
        payloadParaBling.data = dataFormatada;
    }

    if (payloadParaBling.desconto && typeof payloadParaBling.desconto.valor !== 'undefined') {
        payloadParaBling.desconto = {
          valor: payloadParaBling.desconto.valor,
          unidade: 'PERCENTUAL'
        };
    } else {
        delete payloadParaBling.desconto;
    }

    const resultadoBling = await blingService.atualizarPedidoNoBling(pedidoId, payloadParaBling);

    const pedidoDetalhado = await blingService.fetchDetalhesPedidoVenda(pedidoId);

    const upsertQuery = `
      INSERT INTO cache_pedidos (
        id, numero, data_pedido, data_saida, total, total_produtos, status_id, status_nome,
        cliente_id, cliente_nome, cliente_documento, vendedor_id, observacoes, observacoes_internas, updated_at, dados_completos_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15)
      ON CONFLICT (id) DO UPDATE SET
        numero = EXCLUDED.numero, data_pedido = EXCLUDED.data_pedido, data_saida = EXCLUDED.data_saida,
        total = EXCLUDED.total, total_produtos = EXCLUDED.total_produtos, status_id = EXCLUDED.status_id,
        status_nome = EXCLUDED.status_nome, cliente_id = EXCLUDED.cliente_id, cliente_nome = EXCLUDED.cliente_nome,
        cliente_documento = EXCLUDED.cliente_documento, vendedor_id = EXCLUDED.vendedor_id,
        observacoes = EXCLUDED.observacoes, observacoes_internas = EXCLUDED.observacoes_internas, updated_at = NOW(), dados_completos_json = EXCLUDED.dados_completos_json;
    `;
    const params = [
      pedidoDetalhado.id, pedidoDetalhado.numero, pedidoDetalhado.data, pedidoDetalhado.dataSaida || null,
      pedidoDetalhado.total, pedidoDetalhado.totalProdutos, pedidoDetalhado.situacao.id, pedidoDetalhado.situacao.valor,
      pedidoDetalhado.contato.id, pedidoDetalhado.contato.nome, pedidoDetalhado.contato.numeroDocumento || null,
      pedidoDetalhado.vendedor?.id || null, pedidoDetalhado.observacoes || null, pedidoDetalhado.observacoesInternas || null, pedidoDetalhado
    ];
    await db.query(upsertQuery, params);

    const deleteQuery = 'DELETE FROM cache_pedido_itens WHERE pedido_id = $1';
    await db.query(deleteQuery, [pedidoId]);

    if (pedidoDetalhado.itens && pedidoDetalhado.itens.length > 0) {
        const insertQuery = `
            INSERT INTO cache_pedido_itens (
                pedido_id, item_id, produto_id, produto_codigo, produto_nome,
                quantidade, valor_unitario, valor_total
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `;

        const insertPromises = pedidoDetalhado.itens.map(item => {
            const itemParams = [
                pedidoId,
                item.id,
                item.produto.id,
                item.codigo,
                item.descricao,
                item.quantidade,
                item.valor,
                (item.quantidade * item.valor)
            ];
            return db.query(insertQuery, itemParams);
        });

        await Promise.all(insertPromises);
    } else {
    }

    res.json(resultadoBling);

  } catch (error) {
    console.error(`Erro na rota de atualização do pedido ${pedidoId}:`, error.message);
    res.status(500).json({ mensagem: error.message });
  }
});

module.exports = router;