const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const db = require('../db');

router.get('/', autenticarToken, async (req, res) => {
  try {
    const termoDeBusca = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;

    const queryParams = [];
    let paramIndex = 1;

    let whereClause = `WHERE CAST(estoque_saldo_virtual AS NUMERIC) > 0 AND codigo IS NOT NULL AND codigo <> ''`;
    
    if (termoDeBusca.trim().length >= 2) {
      whereClause += ` AND (nome ILIKE $${paramIndex} OR codigo ILIKE $${paramIndex})`;
      queryParams.push(`%${termoDeBusca}%`);
      paramIndex++;
    }

    const totalQuery = `SELECT COUNT(*) FROM cache_produtos ${whereClause}`;
    const totalResult = await db.query(totalQuery, queryParams);
    const totalDeItens = parseInt(totalResult.rows[0].count, 10);

    queryParams.push(limit, offset);
    const produtosQuery = `
      SELECT * FROM cache_produtos
      ${whereClause}
      ORDER BY nome ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
    const { rows: produtosDaPagina } = await db.query(produtosQuery, queryParams);

    const produtosFormatados = produtosDaPagina.map(p => ({
      ...p,
      preco: parseFloat(p.preco) || 0,
      estoque: { saldoVirtualTotal: p.estoque_saldo_virtual },
      imagemURL: p.imagem_url
    }));

    console.log(`Retornando ${produtosFormatados.length} de ${totalDeItens} produtos para a página ${page}.`);
    res.json({ data: produtosFormatados, total: totalDeItens });

  } catch (error) {
    console.error(`Erro na rota /api/produtos:`, error.message);
    res.status(500).json({ mensagem: `Falha ao buscar produtos: ${error.message}` });
  }
});

module.exports = router;