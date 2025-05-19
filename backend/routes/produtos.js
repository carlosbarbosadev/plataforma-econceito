const express = require('express');
const router = express.Router();

const { autenticarToken } = require('../middlewares/authMiddleware');

const pool = require('../db');

// Aqui deve vir função → async (req, res) => { … }
router.get('/', autenticarToken, async (req, res) => { 
  try {
    const { rows } = await pool.query('SELECT * FROM produtos BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro interno' })
  }
});

module.exports = router;
