require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('🔐 Valor do SECRET:', process.env.SECRET);
const SECRET = process.env.SECRET || 'segredo alernativo';

// Middleware que verifica o token e popula o rec.usuario
function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    return res.status(401).json({ mensagem: 'Token não fornecido' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer || !token') {
    return res.status(401).json({ mensagem: 'Formato de token inválido' })
  }
  
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ mensagem: 'Token inválido ou experido'});
    }
    //decoded deve conter {email, tipo} do payload
    req.usuario = decoded;
    next();
  });
}

// Middleware para checar se é ADMIN
function apenasAdmin(req, res, next) {
  // Primeiro garante que req.usuario existe
  if (!req.usuario || req.usuario.tipo !== 'admin') {
    return res.status(403).json({ mensagem: 'Acesso permetido apenas para administrador' });
  }
  next();
}

// Middleware para checar se é VENDEDOR
function apenasVendedor(req, res, next) {
  if (!req.usuario || req.usuario.tipo !== 'vendedor') {
    return res.status(403).json({ mensagem: 'Acesso permitido apenas para vendedor' });
  }
  next();
}

module.exports = { autenticarToken, apenasAdmin, apenasVendedor };