const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const { fetchClientes } = require('../services/bling');

// Rota protegida com autenticação
router.get('/', autenticarToken, async (req, res) => {
  if (!req.usuario) {
    return res.status(401).json({ mensagem: 'Usuário não autenticado' });
  }
  try {
    // traz do Bling
    const todosClientes = await fetchClientes();
    
    if (req.usuario.tipo === 'admin') {
      return res.json(todosClientes);
    }
    // só clientes do próprio vendedor
    const meus = todosClientes.filter(
      (c) => c.emailVendedor === req.usuario.email
    );
    return res.json(meus);
    
  } catch (err) {
    console.error('Erro ao buscar clientes do Bling:', err);
    return res.status(502).json({ mensagem: 'Falha ao buscar dados do Bling' });
  }
});

module.exports = router;
