const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const { fetchProdutos } = require('../services/bling');

// Rota para buscar produtos
router.get( '/', autenticarToken, async (req, res) => {
  console.log(`Rota /api/produtos acessada por: ${req.usuario.email} (Tipo: ${req.usuario.tipo})`);
    try {
      const todosOsProdutos = await fetchProdutos();

      console.log(`Retornando ${todosOsProdutos.length} produtos para o usuário ${req.usuario.email}.`);
      res.json(todosOsProdutos);

  } catch (error) {
    console.error(`Erro na rota /api/produtos ao buscar produtos para ${req.usuario.email}:`, error.message);
    if (!res.headersSent) {
        res.status(500).json({ mensagem: `Falha ao buscar produtos: ${error.message}` });
    }
  }
});

module.exports = router;