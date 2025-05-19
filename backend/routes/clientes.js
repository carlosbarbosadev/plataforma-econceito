const express = require('express');
const router = express.Router();
const pool = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');

// Rota protegida com autenticação
router.get('/', autenticarToken, async (req, res) => {
  // 1) Debug: veja o header e o req.usuario
  console.log('––– /api/clientes –––');
  console.log('Authorization header:', req.headers.authorization);
  console.log('req.usuario:', req.usuario);

  // 2) Guard: se não vier usuário, retorna 401
  if (!req.usuario) {
    return res.status(401).json({ mensagem: 'Usuário não autenticado' });
  }

  try {
    // SELECT simples no Postgres
    const { rows: todosClientes } = await pool.query(`
      SELECT id, nome, email, vendedor
      FROM clientes
      ORDER BY id
    `);
    
    // Lógica de admin x vendedor  
    if (req.usuario.tipo === 'admin') {
      return res.json(todosClientes);
    }

    if (req.usuario.tipo === 'vendedor') {
      const meus = todosClientes.filter(c => c.vendedor === req.usuario.email);
      return res.json(meus);
    }
    return res.status(403).json({ mensagem: 'Tipo de usuário inválido' });
    
  } catch (err) {
    console.error('Erro ao buscar clientes:', err);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
});

module.exports = router;
