const db = require('../db');

function checkPermission(modulo) {
  return async (req, res, next) => {
    try {
      const userId = req.usuario.id;

      const result = await db.query(
        'SELECT 1 FROM user_permissions WHERE user_id = $1 AND module_name = $2',
        [userId, modulo]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ mensagem: 'Acesso negado. Você não tem permissão para este módulo.' });
      }

      next();
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return res.status(500).json({ mensagem: 'Erro interno ao verificar permissão.' });
    }
  };
}

module.exports = { checkPermission };
