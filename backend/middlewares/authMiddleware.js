require('dotenv').config();
const jwt = require('jsonwebtoken');

const SECRET_KEY_JWT = process.env.JWT_SECRET;

function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ mensagem: 'Token não fornecido' });
  }

  // 4) Verifica o JWT
  jwt.verify(token, SECRET_KEY_JWT, (err, decoded) => {
    if (err) {
      return res.status(403).json({ mensagem: 'Token inválido ou expirado' });
    }

    req.usuario = decoded;
    next();
  });
}

function autorizarAdmin(req, res, next) {
  if (req.usuario && req.usuario.tipo === 'admin') {
    next();
  } else {
    res.status(403).json({ mensagem: 'Acesso negado. Rota exclusiva para administradores.' });
  }
}

module.exports = { autenticarToken, autorizarAdmin };
