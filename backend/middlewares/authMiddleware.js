const jwt = require('jsonwebtoken');
const JWT_SECRET = 'segredo_super_secreto';

function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN_AQUI

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).json({ erro: 'Token inválido' });
    }

    req.usuario = usuario; // salva o usuário no request
    next(); // continua para a rota protegida
  });
}

module.exports = autenticarToken;
