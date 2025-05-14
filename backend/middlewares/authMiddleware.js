const jwt = require('jsonwebtoken');
const SECRET = 'embalagens-conceito-123';

// Middleware que verifica o token e extrai os dados do usuário
function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN_AQUI

  if (!token) return res.status(401).json({ mensagem: 'Token não fornecido' });
  
  jwt.verify(token, SECRET, (err, usuario) => {
    if (err) return res.status(403).json({ mensagem: 'Token inválido' });

    req.usuario = usuario; // Armazena os dados do token no request
    next(); // Continua para a rota protegida
  });
}

// Middleware para checar se é ADMIN
function apenasAdmin(req, res, next) {
  if (req.usuario.tipo !== 'admin') {
    return res.status(403).json({ mensagem: 'Acesso permitido apenas para administrador' });
  }
  next();
}

// Middleware para checar se é VENDEDOR
function apenasVendedor(req, res, next) {
  if (req.usuario.tipo ==! 'vendedor') {
    return res.status(403).json({ mensagem: 'Acesso permitido apenas para vendedor' });
  }
  next();
}

module.exports = { autenticarToken, apenasAdmin, apenasVendedor };