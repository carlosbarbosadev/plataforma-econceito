const express = require('express');
const router = express.Router();
const { autenticarToken, apenasAdmin } = require('../middlewares/authMiddleware');

// Apenas administradores veem todos os produtos 
router.get('/', autenticarToken, apenasAdmin, (req, res) => { 
  res.json([
    { id: 1, nome: 'Produto A', preco: 10 },
    { id: 2, nome: 'Produto B', preco: 20 }
  ]);
});

module.exports = router;