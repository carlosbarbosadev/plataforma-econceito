const express = require('express');
const router = express.Router();

// Rota GET para teste de produtos
router.get('/', (req, res) => {
  res.json([
    { id: 1, nome: 'Produto A', preco: 10 },
    { id: 2, nome: 'Produto B', preco: 20 }
  ]);
});

module.exports = router;
