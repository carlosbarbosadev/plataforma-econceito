// backend/routes/clientes.js
const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware'); 
const { fetchClientes } = require('../services/bling'); // Esta função busca TODOS os contatos do Bling

router.get('/', autenticarToken, async (req, res) => {
  // O middleware autenticarToken já validou o token e colocou os dados em req.usuario.
  console.log(`Rota /api/clientes acessada por: ${req.usuario.email} (Tipo: ${req.usuario.tipo})`);

  try {
    // Busca todos os contatos do Bling usando a função do service
    const todosClientesDoBling = await fetchClientes(); 
    let clientesParaRetornar;

    if (req.usuario.tipo === 'admin') {
      console.log('Usuário é ADMIN. Retornando todos os contatos buscados do Bling.');
      clientesParaRetornar = todosClientesDoBling;
    } else if (req.usuario.tipo === 'vendedor') {
      // Como estamos limpando o filtro de vendedor por enquanto,
      // o vendedor também verá todos os clientes.
      // A lógica de filtro específica para vendedor (usando req.usuario.id_vendedor_bling)
      // será reimplementada/ajustada depois que investigarmos os dados de /pedidos.
      console.log(`Usuário VENDEDOR (${req.usuario.email}) acessando. Retornando todos os contatos por enquanto (filtro específico de vendedor pendente).`);
      clientesParaRetornar = todosClientesDoBling;
    } else {
      console.warn(`Tipo de usuário '${req.usuario.tipo}' não reconhecido ou sem permissão para esta rota.`);
      return res.status(403).json({ mensagem: 'Permissão negada para este tipo de usuário.' });
    }

    return res.json(clientesParaRetornar);
    
  } catch (err) {
    console.error('Falha na rota /api/clientes ao buscar dados:', err.message); // Log de erro mais simples
    if (!res.headersSent) {
        // A função fetchClientes já pode ter tratado erros específicos do Bling e lançado uma mensagem.
        // Se não, podemos usar uma mensagem genérica.
        res.status(500).json({ mensagem: `Falha ao processar requisição de clientes: ${err.message}` });
    }
  }
});

module.exports = router;