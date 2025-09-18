require('dotenv').config();
const jwt = require('jsonwebtoken');

const SECRET_KEY_JWT = process.env.JWT_SECRET;

function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ mensagem: 'Token não fornecido' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensagem: 'Formato de token inválido' });
  }

  const token = authHeader.slice(7);

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
