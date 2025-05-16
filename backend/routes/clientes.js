const express = require('express');
const router = express.Router();
const pool = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');

// Rota protegida com autenticação
router.get('/', /* autenticarToken, */ async (req, res) => {
  try {
    // busca todos os clientes do banco 
    const { rows: todosClientes } = await pool.query(`
      SELECT id, nome, email, vendedor
      FROM clientes
      ORDER BY id
    `);

    if (req.usuario.tipo === 'admin') {
      // Admin vê todos
      return res.json(todosClientes);
    }

    if (req.usuario.tipo === 'vendedor') {
      // Venedor só vê seus clientes
      const meusClientes = todosClientes.filter(
        (c) => c.vendedor === req.usuario.email
      );
      return res.json(meusClientes);
    }

    return res.status(403).json({ mensagem: 'Tipo de usuário inválido' });
  } catch (err) {
    console.error('Erro ao buscar clientes:', err);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
});

module.exports = router;
