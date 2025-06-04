const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const { fetchFormasPagamento } = require('../services/bling'); // Importa a função do service

// Rota para buscar as formas de pagamento do Bling
// Acessível em GET /api/utils/formas-pagamento
router.get('/formas-pagamento', autenticarToken, async (req, res) => {
    console.log(`Rota GET /api/utils/formas-pagamento acessada por: ${req.usuario.email}`);
    try {
        const formasDePagamento = await fetchFormasPagamento();

        console.log(`Retornando ${formasDePagamento ? formasDePagamento.length : 0} formas de pagamento.`);
        res.json(formasDePagamento || []);
    } catch (error) {
        console.error(`Erro na rota /api/util/formas-pagamento para ${req.usuario.email}:`, error.message);
        if (!res.headersSent) {
            res.status(500).json({ message: `Falha ao buscar formas de pagamento: ${error.message}` });
        }
    }
});

module.exports = router;