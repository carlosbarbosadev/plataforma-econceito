const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const { fetchFormasPagamento } = require('../services/bling'); // Importa a função do service

const idsCondicoesDePagamento = [
    3359853, 2076718, 2076727, 2076783, 7758544, 4421026, 2076737,
    2091116, 3514108, 2076738, 2076750, 2306222, 2076765, 2127537
];

router.get('/condicoes-pagamento', autenticarToken, async (req, res) => {
    console.log(`Rota GET /api/utils/condicoes-pagamento acessada por: ${req.usuario.email}`);
    try {
        const todasAsFormas = await fetchFormasPagamento();

        const condicoesFiltradas = todasAsFormas.filter(forma => 
            idsCondicoesDePagamento.includes(forma.id)
        );

        console.log(`Retornando ${condicoesFiltradas.length} condições de pagamento.`);
        res.json(condicoesFiltradas || []); 
    } catch (error) {
        console.error(`Erro na rota /api/utils/condicoes-pagamento para ${req.usuario.email}:`, error.message);
        if (!res.headersSent) {
            res.status(500).json({ message: `Falha ao buscar condições de pagamento: ${error.message}` });
        }
    }
});

router.get('/formas-pagamento', autenticarToken, async (req, res) => {
    console.log(`Rota GET /api/utils/formas-pagamento acessada por: ${req.usuario.email}`);
    try {
        const formasDePagamento = await fetchFormasPagamento();

        console.log(`Retornando ${formasDePagamento ? formasDePagamento.length : 0} formas de pagamento.`);
        res.json(formasDePagamento || []);
    } catch (error) {
        console.error(`Erro na rota /api/utils/formas-pagamento para ${req.usuario.email}:`, error.message);
        if (!res.headersSent) {
            res.status(500).json({ message: `Falha ao buscar formas de pagamento: ${error.message}` });
        }
    }
});

module.exports = router;