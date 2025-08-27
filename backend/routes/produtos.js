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

    const codigosParaExcluir = ['AC01', 'BAN0501', 'CRTAB2', 'CRTAB3', 'CRTAB1', 'CRTAK2', 'CRTAK3', 'CRTAK1', '90121084', '3424', 'CXECOMK', 'CDB3', 'CDK3', 'CDG3', 'CD3P', '01062023', 'PCBW', 'PER', 'CBPDQC32', 'CBPRQ32', 'CAMP', 'CAGP', 'CAGGP', 'CMNPX', 'CIEC', '09911', 'FPG100', 'FPG12', 'FPG50', 'FPM100', 'FPM12', 'FPM50', 'FPP100', 'FPP12', 'FPP50', 'FPV12', 'Kit01', 'SCPZ', 'SCB1', 'TMF', '40002003', '400002015', '40002027', 'BLD1', 'BLD12', 'BLD2', 'BLD3', 'BLD5', 'BLD7', 'BLDR', 'BONI-FD02'];

    const queryParams = [];
    let paramIndex = 1;

    let whereClause = `WHERE codigo IS NOT NULL AND codigo <> '' AND codigo <> ALL($${paramIndex++})`;
    queryParams.push(codigosParaExcluir);
    
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

router.get('/search-for-campaign', autenticarToken, async (req, res) => {
    const termoDeBusca = req.query.search || '';

    if (termoDeBusca.trim().length < 2) {
        return res.json([]);
    }

    console.log(`Buscando produtos para campanha com o termo: ${termoDeBusca}`);
    try {
        const query = `
            SELECT id, nome, codigo, preco
            FROM cache_produtos
            WHERE (nome ILIKE $1 OR codigo ILIKE $1)
            ORDER BY nome ASC
            LIMIT 20;
        `;
        const { rows } = await db.query(query, [`%${termoDeBusca}%`]);

        const produtosFormatados = rows.map(p => ({
            id: p.id,
            nome: p.nome,
            codigo: p.codigo,
            preco: parseFloat(p.preco) || 0
        }));

        res.json(produtosFormatados);

    } catch (error) {
        console.error(`Erro na rota /api/produtos/search-for-campaign:`, error.message);
        res.status(500).json({ mensagem: `Falha ao buscar produtos para campanha: ${error.message}` });
    }
});

module.exports = router;