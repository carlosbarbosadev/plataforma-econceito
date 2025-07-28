const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const db = require('../db');

router.get('/', autenticarToken, async (req, res) => {
  try {
    const termoDeBusca = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    console.log(`Rota /api/produtos (DB) acessada. Página: ${page}, Busca: "${termoDeBusca}"`);

    const { rows } = await db.query(`
      SELECT * FROM cache_produtos
      WHERE estoque_saldo_virtual > 0
        AND codigo IS NOT NULL
        AND codigo <> ''
      ORDER BY nome ASC
    `);

    const produtosFormatados = rows.map(p => ({
      ...p,
      preco: parseFloat(p.preco) || 0,
      estoque: {
        saldoVirtualTotal: p.estoque_saldo_virtual
      },
      imagemURL: p.imagem_url
    }));

    const todosOsProdutosDoCache = produtosFormatados;

    let produtosFiltrados = todosOsProdutosDoCache;
    if (termoDeBusca.trim().length >= 2) {
      const termoLower = termoDeBusca.toLowerCase();
      produtosFiltrados = todosOsProdutosDoCache.filter(produto => 
        (produto.nome && produto.nome.toLowerCase().includes(termoLower)) ||
        (produto.codigo && produto.codigo.toLowerCase().includes(termoLower))
      );
    }

    const limit = 100;
    const totalDeItens = produtosFiltrados.length;

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const produtosDaPagina = produtosFiltrados.slice(startIndex, endIndex);

    console.log(`Retornando ${produtosDaPagina.length} produtos da página ${page} (do DB). Total filtrado: ${totalDeItens}`);

    res.json({ data: produtosDaPagina, total: totalDeItens });

  } catch (error) {
    console.error(`Erro na rota /api/produtos:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ mensagem: `Falha ao buscar produtos: ${error.message}` });
    }
  }
});

module.exports = router;