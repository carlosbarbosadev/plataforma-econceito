const express = require('express');
const router = express.Router();
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

const blingClientId = process.env.BLING_CLIENT_ID;
const blingRedirectUri = process.env.BLING_REDIRECT_URI;

router.get('/', (req, res) => {
  const params = querystring.stringify({
    response_type: 'code',
    client_id: blingClientId,
    redirect_uri: blingRedirectUri,
    scope: 'produtos clientes pedidos vendas',
    state: 'seguro123',
  });

  const url = `https://www.bling.com.br/Api/v3/oauth/authorize?${params}`;
  console.log(`Redirecionando para Bling OAuth: ${url}`);
  res.redirect(url);
});


router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Email e senha são obrigatórios.' });
  }

  try {
    // 1. Buscar o usuário no banco de dados pelo email
    const queryText = 'SELECT * FROM usuarios WHERE email = $1';
    const { rows } = await db.query(queryText, [email]); // Usando db.query do seu módulo

    if (rows.length === 0) {
      console.log(`Tentativa de login falhou: Usuário não encontrado para email ${email}`);
      return res.status(401).json({ mensagem: 'Credenciais inválidas.' }); // Mensagem genérica
    }

    const usuario = rows[0];
    console.log(`Usuário encontrado no DB: ${usuario.email}, Tipo: ${usuario.tipo_usuario}`);

    // 2. Comparar a senha fornecida com a senha hasheada armazenada
    // (Lembre-se que 'senha' é a senha em texto puro enviada pelo usuário, 
    // e 'usuario.senha_hash' é o hash que você guardou no banco)
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      console.log(`Tentativa de login falhou: Senha incorreta para usuário ${email}`);
      return res.status(401).json({ mensagem: 'Credenciais inválidas.' }); // Mensagem genérica
    }

    console.log(`Login bem-sucedido para usuário ${email}. Gerando token JWT...`);
    const payload = {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      tipo: usuario.tipo_usuario, // Este campo 'tipo' será usado no seu authMiddleware
      id_vendedor_bling: usuario.id_vendedor_bling
    };

    const secretKey = process.env.JWT_SECRET;

    if (!secretKey) {
      console.error("Erro CRÍTICO: Chave secreta JWT (JWT_SECRET) não definida no .env!");
      return res.status(500).json({ mensagem: "Erro interno do servidor (configuração JWT ausente)." });
    }

    const token = jwt.sign(payload, secretKey, { expiresIn: '7d' }); // Token expira em 7 dias

    res.json({
      mensagem: 'Login bem-sucedido!',
      token: token,
      usuario: { // Opcional: enviar alguns dados do usuário de volta para o frontend
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        tipo: usuario.tipo_usuario
      }
    });

  } catch (error) {
    console.error('Erro no endpoint /api/auth/login:', error);
    res.status(500).json({ mensagem: 'Erro interno do servidor durante o login.' });
  }
});

module.exports = router;