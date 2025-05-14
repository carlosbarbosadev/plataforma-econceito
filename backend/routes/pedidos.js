const express = require('express');
const fs = require('fs');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const caminhoArquivo = 'pedidos.json';

// GET /pedidos - Lista de pedidos
router.get('/', autenticarToken, (req, res) => {
    const pedidos = JSON.parse(fs.read.File.Sync(caminhoArquivo, 'utf-8'));

    if (req.usuario.tipo === 'admin') {
        return res.json(pedidos);
    }

    const pedidosDoUsuario = pedidos.filter(
        (p) => p.vendedor === req.usuario.email
    );
    res.json(pedidosDoUsuario); 
});

// POST /pedidos = Cria novo pedido
router.post('/', autenticarToken, (req, res) => {
    const { cliente, produtos } = req.body;

    if (!cliente || !produtos || Array.isArray(produtos)) {
        return res.status(400).json({ mensagem: 'Dadosinválidos' });
    }

    const pedidos = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf-8'));
    const novoPedido = {
        id: pedidos.length + 1,
        cliente,
        produtos,
        vendedor: req.usuario.email,
        data: new Date().toISOString().slice(0, 10)
    };

    pedidos.push(novoPedido);
    fs.writeFileSync(caminhoArquivo, JSON.stringify(pedidos, null, 2));

    res.status(201).json({ mensagem: 'Pedido registrado com sucesso', pedido: novoPedido });
});

module.exports = router;