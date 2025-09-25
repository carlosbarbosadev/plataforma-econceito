const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const blingService = require('../services/bling')
const db = require('../db');

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
    console.log(`Rota POST /api/pedidos (criar) acessada por: ${req.usuario.email} (Tipo: ${req.usuario.tipo})`);

    try {
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
        if (!idFormaPagamentoBling || (valorTotalPedido === undefined || valorTotalPedido === null) ) {
        return res.status(400).json({ mensagem: "Forma de pagamento e valor total para parcela são obrigatórios." });
        }
        if (!req.usuario.id_vendedor_bling && req.usuario.tipo === 'vendedor') {
        return res.status(403).json({ mensagem: 'ID de vendedor do Bling não configurado para este usuário. Não é possível criar o pedido.' });
        }

        const parcelasParaBling = calcularParcelas(idFormaPagamentoBling, valorTotalPedido);

        const hoje = new Date().toISOString().split('T')[0];
        const pedidoParaBling = {
            data: dataPedido || hoje,
            dataSaida: dataPedido || hoje,
            contato: {
                id: Number(idClienteBling)
            },
            situacao: {
                id: 47722
            },
            itens: itensPedido.map(item => ({
                produto: { id: Number(item.idProdutoBling) },
                quantidade: Number(item.quantidade),
                valor: Number(item.valorUnitario),
                codigo: item.codigo || undefined,
                descricao: item.descricao || undefined
            })),
            parcelas: parcelasParaBling,
            ...(req.usuario.id_vendedor_bling && {
                vendedor: {
                    id: Number(req.usuario.id_vendedor_bling)
                }
            }),
            ...(observacoes && { observacoes: observacoes }),
            ...(observacoesInternas && { observacoesInternas: observacoesInternas }),
            // Outros campos como 'loja', 'numeroPedidoCompra', 'desconto', 'transporte' podem ser adicionados aqui
            // com base no JSON completo que você viu e na documentação do Bling
        };

        console.log("Enviando para criarPedidoVenda no service o objeto:", JSON.stringify(pedidoParaBling, null, 2));
        const resultadoBling = await blingService.criarPedidoVenda(pedidoParaBling);
        console.log('Pedido criado com sucesso no Bling.');

        const novoPedidoId = resultadoBling.data?.id;
        if (novoPedidoId) {
            console.log(`Atualizando cache local para o novo pedido ID: ${novoPedidoId}`);
            const pedidoDetalhado = await blingService.fetchDetalhesPedidoVenda(novoPedidoId);

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
            console.log(`Cache local atualizado para o pedido ID: ${novoPedidoId}`);
        } else {
            console.warn('Bling criou o pedido, mas não retornou um ID. Cache local não sera atualizado.');
        }

        res.status(201).json({ mensagem: "Pedido criado com sucesso no Bling!", data: resultadoBling.data });

    } catch (error) {
        console.error('Erro na rota POST /api/pedidos:', JSON.stringify(error.response?.data, null, 2) || error.message);
        if (!res.headersSent) {
            const status = error.response?.status || 500;
            res.status(status).json({ mensagem: error.response?.data?.mensagem || error.message || "Erro desconhecido ao criar pedido." });
        }
    }
});

// NOVA ROTA: Buscar detalhes de um pedido de venda específico
// GET /api/pedidos/{idPedidoVenda}
router.get ('/:idPedidoVenda', autenticarToken, async(req, res) => {
    const { idPedidoVenda } = req.params; // Pega o ID da URL
    console.log(`Rota GET /api/pedidos/${idPedidoVenda} acessada por: ${req.usuario.email}`);

    if(!idPedidoVenda || isNaN(Number(idPedidoVenda))) {
        return res.status(400).json({ mensagem: "ID do Pedido inválido ou não fornecido." });
    }

    try {
        const detalhesDoPedido = await blingService.fetchDetalhesPedidoVenda(idPedidoVenda);

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

        // Lógica de permissão para verificar se o vendedor pode ver este pedido
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

    res.json(resultadoBling);

  } catch (error) {
    console.error(`Erro na rota de atualização do pedido ${pedidoId}:`, error.message);
    res.status(500).json({ mensagem: error.message });
  }
});

module.exports = router;