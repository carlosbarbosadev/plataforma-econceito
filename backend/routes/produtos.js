const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const db = require('../db');

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

    const codigosParaExcluir = 
      ['AC01', 'BAN0501', 'CRTAB2', 'CRTAB3', 'CRTAB1', 'CRTAK2', 'CRTAK3', 'CRTAK1', '90121084', '3424',
      'CXECOMK', 'CDB3', 'CDK3', 'CDG3', 'CD3P', '01062023', 'PCBW', 'PER', 'CBPDQC32', 'CBPRQ32', 'CAMP',
      'CAGP', 'CAGGP', 'CMNPX', 'CIEC', '09911', 'FPG100', 'FPG12', 'FPG50', 'FPM100', 'FPM12', 'FPM50', 'FPP100',
      'FPP12', 'FPP50', 'FPV12', 'Kit01', 'SCPZ', 'SCB1', 'TMF', '40002003', '400002015', '40002027', 'BLD1', 'BLD12', 'BLD2',
      'BLD3', 'BLD5', 'BLD7', 'BLDR', 'BONI-FD02', 'CPBLV02', 'CPBL03', 'CPBLV01', 'CFJ02', 'CFJ01', 'C4OCA', 'C4OCS', 'C5M02',
      'C5MOB', 'C5MOC', 'C5MOE', 'C5MOF', 'C5MOG', 'C5M01', 'C5MOR', 'CBVPA', 'CBVPS', 'CC1', 'CSP', 'CCD', 'CCPS', 'CCLA',
      'CCLS', 'CCVPA', 'CCVPS', 'CLHP2', 'CLHP1', 'CMXP01', 'CMXP03', 'CM3OA', 'CM3OB', 'CM3OK', 'CM3OS', 'CMCP', 'CMCA',
      'CMCS', 'CMSA', 'CMSS', 'CXMC', 'CXMR', 'CXMC30', 'CXMC09', 'CXMC07', 'CXMC06', 'CXMC08', 'CXMC05', 'CXMC02', 'CXMC10',
      'COBR08', 'COCBA', 'COBB1', 'COBC', 'COBD', 'COBE', 'COBF', 'COBK05', 'COBR', 'COCBS', 'COBA06', 'CGU02', 'CGU01', 'CGU01', 'COP008',
      'COP005', 'COP012', 'COP010', 'COP013', 'COP006', 'COGK250', 'COBS', 'CXBB1238', 'CXBB1233', 'CXBB1209', 'CXBB1219', 'CXBB0215',
      'CXBB0210', 'CXBB0209', 'CXBB0214', 'CXBB0420', 'CXBB0413', 'CXVB0401', 'CXBB0411', 'CXBB0412', 'PCX4', 'CXBB0419', 'CXBB0649',
      'CXBB0673', 'CXBB0657', 'CXBB0607', 'CXBB0669', 'CXBB0658', 'CXBB0668', 'CXBB0659', 'PCX6', 'CXBB0631', 'CXBB0650', 'CXBB0672',
      'CXBB0637', 'CBCP04', 'CBCP03', 'CBCP01', 'CBWA', 'CBWB', 'CBWS', 'COC6E', 'COC6R', 'CXOPA', 'CXOPB', 'CXOPK', 'CXOPS', 'CPFJA',
      'CPFJE', 'CPFJQ', 'unid', 'COBR09', 'CTOA', 'COBB01', 'CTOC', 'CTOBF', 'COBK04', 'CTOR', 'CTOS', 'COBA07', 'COGB04', 'COGK04',
      'COP016', 'COP009', 'COP004', 'COP011', 'COP015', 'COP014', 'COP007', 'CBSA', 'CBSS', 'APA', 'APB', 'A002', 'A001', 'APD', 'APG',
      'AFJR', 'APS', 'CBMPA', 'CMPB', 'CPM01', 'CMPD', 'CMPG', 'CBMPS', 'CPF1', 'CPF2', 'CPP02', 'CC02', 'CC01', 'CB1A', 'CB1CA', 'CB1CL',
      'CB1CR', 'CB1C', 'CB1E', 'CB1R', 'CB1S', 'CB12C', 'CB12E', 'CB12R', 'CBO3A', 'CBO3S', 'CB4A', 'CB4C', 'CB4C', 'CB4E', 'CB4R', 'CB4S',
      'CB6A', 'CB6C', 'CB6E', 'CB6R', 'CB6S', 'CBO6A', 'CBO6S', 'PCIC', 'CICXBC', 'CICXBE', 'CICXBR', 'CIEA', 'CIES', 'CISRA', 'CISRS',
      'CISQA', 'CISQS', 'GRFJQ', 'MCAC', 'MCCC', 'MCRC', 'MCTC', 'PLFJ01', 'PLFJ02', 'SPB', 'SPG', 'SPF', 'SGPA', 'SMPA', 'SPD', 'SMPS', 'SQA',
      'SQC', 'SQE', 'SQR', 'SQS', 'TPB', 'TAG01', 'TAG02', 'TPC', 'TPD', 'TPE', 'TPF', 'TPG', 'TMPA', 'TMPS', 'TKP01', 'TKP02', 'TKP03', 'TKP04',
      'TKP05', 'PC01', 'TPR', 'TRPS', 'TRPA', 'TDFJA', 'PCCS', 'PC250', 'PC500', 'PC100', 'CXBB1210', 'CXBB1231', 'CFJ03', 'CXBB1232',];

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