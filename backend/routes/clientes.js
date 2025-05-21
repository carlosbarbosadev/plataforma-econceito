const express = require('express');
const router = express.Router();
// const { autenticarToken } = require('../middlewares/authMiddleware');
const { fetchClientes } = require('../services/bling');

// Rota SEM autenticação para teste
router.get('/', /* autenticarToken,*/ async (req, res) => {

  // LINHA ABAIXO COMENTADA PARA TESTE
  //if (!req.usuario) {
    //return res.status(401).json({ mensagem: 'Usuário não autenticado' });
  //}

  try {
    const todosClientes = await fetchClientes();

/*    if (req.usuario.tipo === 'admin') {
      return res.json(todosClientes);
    }
    // só clientes do próprio vendedor
    const meus = todosClientes.filter(
      c => c.emailVendedor === req.usuario.email
    );
    return res.json(meus); */

    // PARA TESTE, SIMPLESMTENTE RETORNE TODOS OS CLIENTES
    return res.json(todosClientes);
    
  } catch (err) {
    console.error('Falha ao buscar dados do Bling:', err);
    return res.status(502).json({ mensagem: 'Falha ao buscar dados do Bling' });
  }
});

module.exports = router;
