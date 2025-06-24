const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const { fetchPedidosVendas, criarPedidoVenda, fetchDetalhesPedidoVenda } = require('../services/bling');
const blingService = require('../services/bling')
const { atualizarPedidoNoBling } = require('../services/bling');

// Rota para: Buscar/Listar pedidos de venda
router.get('/', autenticarToken, async (req, res) => {
    console.log(`Rota  GET /api/pedidos acessada por: ${req.usuario.email} (Tipo: ${req.usuario.tipo})`);
    try {
        let idVendedorParaFiltrar = null;
        if (req.usuario.tipo === 'vendedor') {
            idVendedorParaFiltrar = req.usuario.id_vendedor_bling;
            if (!idVendedorParaFiltrar) {
                console.warn(`Vendedor ${req.usuario.email} não possui 'id_vendedor_bling' definido no token. Buscando todos os pedidos como fallback ou considerar erro.`);
                return res.status(403).json({ mensagem: 'ID de vendedor do Bling não configurado para este usuário' })
            }
        }
        const todosOsPedidos = await fetchPedidosVendas(idVendedorParaFiltrar);
        console.log(`Retornando ${todosOsPedidos.length} pedidos para o usuário ${req.usuario.email}.`);
        res.json(todosOsPedidos);
    } catch (error) {
        console.error(`Erro na rota /api/pedidos ao buscar pedidos para ${req.usuario.email}:`, error.message);
        if (!res.headersSent) {
            res.status(500).json({ mensagem: `Falha ao buscar pedidos: ${error.message}` });
        }
    }
});

// Rota para: Criar um pedido de venda (POST /api/pedidos/)
router.post('/', autenticarToken, async (req, res) => {
    console.log(`Rota POST /api/pedidos (criar) acessada por: ${req.usuario.email} (Tipo: ${req.usuario.tipo})`);

    const {
        idClienteBling,
        itensPedido,
        idFormaPagamentoBling,
        valorTotalPedido,
        dataVencimentoParcela,
        observacoes,
        dataPedido
    } = req.body;

    if (!idClienteBling || !itensPedido || !Array.isArray(itensPedido) || itensPedido.length === 0) {
        return res.status(400).json({ mensagem: "ID do cliente e pelo menos um item são obrigatórios." });
    }
    if (!idFormaPagamentoBling || (valorTotalPedido === undefined || valorTotalPedido === null) ) {
        return res.status(400).json(400)({ mensagem: "Forma de pagamento e valor total para parcela são obrigatórios." });
    }
    if (!req.usuario.id_vendedor_bling && req.usuario.tipo === 'vendedor') {
        return res.status(403).json({ mensagem: 'ID de vendedor do Bling não configurado para este usuário. Não é possível criar o pedido.' });
    }

    const dadosDoFrontend = req.body;
    const hoje = new Date().toISOString().split('T')[0];
    const pedidoParaBling = {
        data: dataPedido || hoje,
        dataSaida: dataPedido || hoje,
        // dataPrevista: dataPedido || hoje,
        contato: {
            id: Number(dadosDoFrontend.idClienteBling)
        },
        itens: itensPedido.map(item => ({
            produto: { id: Number(item.idProdutoBling) },
            quantidade: Number(item.quantidade),
            valor: Number(item.valorUnitario),
            codigo: item.codigo || undefined,
            descricao: item.descricao || undefined
        })),
        parcelas: [{
            dataVencimento: dataVencimentoParcela || hoje,
            valor: Number(valorTotalPedido),
            formaPagamento: { id: Number(dadosDoFrontend.idFormaPagamentoBling) }
            // observacoes: "Parcela única"
        }],
        ...(req.usuario.id_vendedor_bling && {
            vendedor: {
                id: Number(req.usuario.id_vendedor_bling)
            }
        }),
        ...(observacoes && { observacoes: observacoes }),
        // Outros campos como 'loja', 'numeroPedidoCompra', 'desconto', 'transporte' podem ser adicionados aqui
        // com base no JSON completo que você viu e na documentação do Bling
    };

    try {
        console.log("Enviando para criarPedidoVenda no service o objeto:", JSON.stringify(pedidoParaBling, null, 2));
        const resultadoBling = await criarPedidoVenda(pedidoParaBling);
        res.status(201).json({ mensagem: "Pedido criado com sucesso no Bling!", data: resultadoBling });
    } catch (error) {
        console.log('Erro na rota POST /api/pedidos ao criar pedido via service:', error.message);
        if (!res.headersSent) {
            const status = error.response?.status || 500;
            res.status(status).json({ mensagem: error.message || "Erro desconhecido ao criar pedido." });
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
        const detalhesDoPedido = await fetchDetalhesPedidoVenda(idPedidoVenda);

        // Opcional: Lógica de permissão para verificar se o vendedor pode ver este pedido
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
        const resultado = await blingService.atualizarPedidoNoBling(pedidoId, pedidoEditadoDoFrontend);
        res.json(resultado);
    } catch (error) {
        console.error(`Erro na rota de atualização do pedido ${pedidoId}:`, error.message);
        res.status(500).json({ mensagem: error.message });
    }
});

module.exports = router;