const express = require('express');
const router = express.Router();
const fs = require('fs');
const { autenticarToken } = require('../middlewares/authMiddleware');

// Rota protegida com autenticação
router.get('/', autenticarToken, (req, res) => {
    const todosClientes = JSON.parse(fs.readFileSync('clientes.json', 'utf-8'));

    if (req.usuario.tipo === 'admin') {
    // Admin vê todos
    return res.json(todosClientes);
    } else if (req.usuario.tipo === 'vendedor') {
    // Vendedor vê  apenas seus clientes
    const clienteDoVendedor = todosClientes.filter(
        (cliente) => cliente.vendedor === req.usuario.email
    );
    return res.json(clienteDoVendedor);
  } else {
    return res.status(403).json({ mensagem: 'Tipo de usuário Inválido' });
    }
});

module.exports = router;