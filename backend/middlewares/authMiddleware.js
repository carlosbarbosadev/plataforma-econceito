// backend/middlewares/authMiddleware.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

const SECRET = process.env.SECRET || 'segredo-alternativo';

function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // 1) Verifica se trouxe o header
  if (!authHeader) {
    return res.status(401).json({ mensagem: 'Token não fornecido' });
  }
  // 2) Verifica o prefixo “Bearer ”
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensagem: 'Formato de token inválido' });
  }
  // 3) Remove o “Bearer ” e pega só o token
  const token = authHeader.slice(7);

  // 4) Verifica o JWT
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ mensagem: 'Token inválido ou expirado' });
    }
    // 5) decoded deve ter { email, tipo, nome }
    req.usuario = decoded;
    next();
  });
}

module.exports = { autenticarToken };
