const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const { fetchProdutos } = require('../services/bling');

let cacheDeProdutos = [];
let tempoDoCache = 0;
const UMA_HORA_EM_MS = 60 * 60 * 1000;
// ---------------------------------

router.get('/', autenticarToken, async (req, res) => {
  try {
    const termoDeBusca = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    console.log(`Rota /api/produtos acessada. Página: ${page}, Busca: "${termoDeBusca}"`);

    // GERENCIA O CACHE
    const agora = Date.now();
    if (cacheDeProdutos.length === 0 || (agora - tempoDoCache > UMA_HORA_EM_MS)) {
      console.log("Cache vazio ou expirado. Buscando todos os produtos no Bling...");
      const todosOsProdutos = await fetchProdutos();
      
      cacheDeProdutos = todosOsProdutos;
      tempoDoCache = agora;
      console.log(`Cache de produtos atualizado com ${cacheDeProdutos.length} itens.`);
    }

    let produtosFiltrados = cacheDeProdutos;
    if (termoDeBusca.trim().length >= 2) {
      const termoLower = termoDeBusca.toLowerCase();
      produtosFiltrados = cacheDeProdutos.filter(produto =>
        (produto.nome && produto.nome.toLowerCase().includes(termoLower)) ||
        (produto.codigo && produto.codigo.toLowerCase().includes(termoLower))
      );
    }

    const limit = 100;
    const totalDeItens = produtosFiltrados.length;
    
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const produtosDaPagina = produtosFiltrados.slice(startIndex, endIndex);

    console.log(`Retornando ${produtosDaPagina.length} produtos da página ${page}. Total filtrado: ${totalDeItens}`);
    
    res.json({ data: produtosDaPagina, total: totalDeItens });

  } catch (error) {
    console.error(`Erro na rota /api/produtos:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ mensagem: `Falha ao buscar produtos: ${error.message}` });
    }
  }
});

module.exports = router;