const express = require('express');
const router = express.Router();
const fs = require('fs');

// Lê o arquivo de usuários
const usuarios = JSON.parse(fs.readFileSync('./usuarios.json', 'utf-8'));

// Rota POST para login
router.post('/', (req, res) => {
  const { email, senha } = req.body;

  const usuario = usuarios.find(
    (u) => u.email === email && u.senha === senha
  );

  if (!usuario) {
    return res.status(401).json({ mensagem: 'Credenciais inválidas' });
  }

  // Exemplo simples sem autenticação real
  const token = `${usuario.email}-token`;

  res.json({
    mensagem: 'Login realizado com sucesso',
    token,
    tipo: usuario.tipo,
    nome: usuario.nome
  });
});

module.exports = router;
