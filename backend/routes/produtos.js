const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const db = require('../db');
const { sincronizarProdutos } = require('../services/blingSyncService');

async function getIdsProdutosEmCampanhaAtiva() {
  try {
    const campanhasAtivasQuery = `
      SELECT id FROM campanhas WHERE NOW() BETWEEN data_inicio AND data_fim;
    `;
    const { rows: campanhasAtivas } = await db.query(campanhasAtivasQuery);

    if (campanhasAtivas.length === 0) {
      return new Set();
    }

    const idsCampanhasAtivas = campanhasAtivas.map(c => c.id);

    const produtosEmCampanhaQuery = `
      SELECT produto_id FROM campanha_produtos WHERE campanha_id = ANY($1::int[]);
    `;
    const { rows: produtosEmCampanha } = await db.query(produtosEmCampanhaQuery, [idsCampanhasAtivas]);

    return new Set(produtosEmCampanha.map(p => p.produto_id));

  } catch (error) {
    console.error("Erro ao buscar produtos em campanha ativa:", error);
    return new Set();
  }
};

router.get('/', autenticarToken, async (req, res) => {
  try {

    const idsProdutosEmCampanha = await getIdsProdutosEmCampanhaAtiva();

    const termoDeBusca = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;

    const filtroTema = req.query.tema || '';

    const queryParams = [];
    let paramIndex = 1;

    let whereClause = `WHERE situacao = 'A'`;
    
    if (termoDeBusca.trim().length >= 2) {
      whereClause += ` AND (nome ILIKE $${paramIndex} OR codigo ILIKE $${paramIndex})`;
      queryParams.push(`%${termoDeBusca}%`);
      paramIndex++;
    }

    if (filtroTema) {
      whereClause += ` AND (dados_completos_json->>'descricaoCurta') ILIKE $${paramIndex}`;
      queryParams.push(`%[TEMA: ${filtroTema}]%`);
      paramIndex++;
    }

    const totalQuery = `SELECT COUNT(*) FROM cache_produtos ${whereClause}`;
    const totalResult = await db.query(totalQuery, queryParams);
    const totalDeItens = parseInt(totalResult.rows[0].count, 10);

    queryParams.push(limit, offset);
    const produtosQuery = `
      SELECT * FROM cache_produtos
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
    const { rows: produtosDaPagina } = await db.query(produtosQuery, queryParams);

    const produtosFormatados = produtosDaPagina.map(p => {
      const emCampanha = idsProdutosEmCampanha.has(p.id);

      return {
      ...p,
        preco: parseFloat(p.preco) || 0,
        estoque: { saldoVirtualTotal: p.estoque_saldo_virtual },
        imagemURL: p.imagem_url,
        emCampanha: emCampanha
      };
    });

    console.log(`Retornando ${produtosFormatados.length} de ${totalDeItens} produtos para a página ${page}.`);
    res.json({ data: produtosFormatados, total: totalDeItens });

  } catch (error) {
    console.error(`Erro na rota /api/produtos:`, error.message);
    res.status(500).json({ mensagem: `Falha ao buscar produtos: ${error.message}` });
  }
});

router.get('/search', autenticarToken, async (req, res) => {
    const termoDeBusca = req.query.search || '';

    if (termoDeBusca.trim().length < 2) {
        return res.json([]);
    }

    console.log(`Buscando produtos para campanha com o termo: ${termoDeBusca}`);
    try {
        const query = `
            SELECT id, nome, codigo, preco, estoque_saldo_virtual
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
            preco: parseFloat(p.preco) || 0,
            estoque: parseFloat(p.estoque_saldo_virtual) || 0
        }));

        res.json(produtosFormatados);

    } catch (error) {
        console.error(`Erro na rota /api/produtos/search:`, error.message);
        res.status(500).json({ mensagem: `Falha ao buscar produtos para campanha: ${error.message}` });
    }
});

router.get('/by-ids', autenticarToken, async (req, res) => {
    const { ids } = req.query;

    if (!ids || typeof ids !== 'string' || ids.trim() === '') {
        return res.status(400).json({ mensagem: 'Nenhum ID de produto fornecido.' });
    }

    const idArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(Number.isInteger);

    if (idArray.length === 0) {
        return res.json([]);
    }

    try {
        const query = 'SELECT id, nome, codigo, imagem_url FROM cache_produtos WHERE id = ANY($1::bigint[])';
        const { rows } = await db.query(query, [idArray]);
        res.json(rows);

    } catch (error) {
      console.error('Erro ao buscar produtos por IDs:', error);
      res.status(500).json({ mensagem: 'Erro interno ao buscar produtos.' });
    }
});

router.get('/por-campanha/:id', autenticarToken, async (req, res) => {
  const { id: campanhaId } = req.params;

  try {
    const query = `
      SELECT p.* FROM cache_produtos p
      JOIN campanha_produtos cp ON p.id = cp.produto_id
      WHERE cp.campanha_id = $1;
    `;
    const { rows } = await db.query(query, [campanhaId]);
    const produtosComFlag = rows.map(p => ({ ...p, emCampanha: true }));

    res.json(produtosComFlag)

  } catch (error) {
      console.error(`Erro ao buscar produtos para a campanha ${campanhaId}:`, error);
      res.status(500).json({ mensagem: 'Erro interno ao buscar produtos da campanha.' });
  }
});

module.exports = router;