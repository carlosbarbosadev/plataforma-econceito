const express = require('express');
const router = express.Router();
const fs = require('fs');
const jwt = require('jsonwebtoken');

const SECRET = 'embalagens-conceito-123'

router.get ('/', (req, res) => {
  res.send('Rota /login está ativa. Use POST via Postamn para autenticar.');
});

// ROTA POST PARA LOGIN REAL
router.post('/', (req, res) => {
  const { email, senha } = req.body;
  const usuarios = JSON.parse(fs.readFileSync('usuarios.json', 'utf-8'));

  const usuario = usuarios.find((u) => u.email === email && u.senha === senha);

  if (!usuario) {
    return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
  }

const token = jwt.sign(
  {
    email: usuario.email,
    tipo: usuario.tipo,
    nome: usuario.nome
  },
  SECRET,
  { expiresIn: '2h' }
);

res.json({
  mensagem: 'Login realizado com sucesso',
  token,
  usuario: {
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo
    }
  });
});

module.exports = router;
