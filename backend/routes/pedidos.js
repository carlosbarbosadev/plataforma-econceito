const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const { fetchPedidosVendas } = require('../services/bling');

router.get('/', autenticarToken, async (req, res) => {
    console.log(`Rota /api/pedidos acessada por: ${req.usuario.email} (Tipo: ${req.usuario.tipo})`);
    try {
        let idVendedorParaFiltrar = null;
        if (req.usuario.tipo === 'vendedor') {
            idVendedorParaFiltrar = req.usuario.id_vendedor_bling;
            if (!idVendedorParaFiltrar) {
                console.warn(`Vendedor ${req.usuario.email} não possui 'id_vendedor_bling' definido no token. Buscando todos os pedidos como fallback ou considerar erro.`);
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

module.exports = router;