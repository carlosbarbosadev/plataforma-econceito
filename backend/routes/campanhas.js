const express = require('express');
const router = express.Router();
const { autenticarToken, autorizarAdmin } = require('../middlewares/authMiddleware');
const db = require('../db');

router.post('/', autenticarToken, autorizarAdmin, async (req, res) => {
    const { nome, descricao, data_inicio, data_fim, meta_vendas, produtos, condicoes } = req.body;

    if (!nome || !data_inicio || !data_fim || !produtos || !Array.isArray(produtos)) {
        return res.status(400).json({ mensagem: "Campos obrigatórios ausentes ou inválidos." });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const campanhaQuery = `
            INSERT INTO campanhas (nome, descricao, data_inicio, data_fim, meta_vendas, condicoes)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
        `;
        const campanhaResult = await client.query(campanhaQuery, [nome, descricao, data_inicio, data_fim, meta_vendas, JSON.stringify(condicoes || [])]);
        const novaCampanhaId = campanhaResult.rows[0].id;

        const produtosQuery = 'INSERT INTO campanha_produtos (campanha_id, produto_id) VALUES ($1, $2)';
        for (const produtoId of produtos) {
            await client.query(produtosQuery, [novaCampanhaId, produtoId]);
        }

        await client.query('COMMIT');
        res.status(201).json({ id: novaCampanhaId, mensagem: 'Campanha criada com sucesso.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar campanha:', error);
        res.status(500).json({ mensagem: 'Erro interno ao criar a campanha.' });
    } finally {
        client.release();
    }
});

router.get('/', autenticarToken, async (req, res) => {
    try {
        const query = `
            SELECT c.*,
                   (SELECT json_agg(cp.produto_id) FROM campanha_produtos cp WHERE cp.campanha_id = c.id) as produtos_ids
            FROM campanhas c
            ORDER BY c.data_inicio DESC;
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar campanhas:', error);
        res.status(500).json({ mensagem: 'Erro interno ao listar campanhas.' });
    }
});

router.put('/:id', autenticarToken, autorizarAdmin, async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, data_inicio, data_fim, meta_vendas, produtos, condicoes } = req.body;

    if (!nome || !data_inicio || !data_fim || !produtos || !Array.isArray(produtos)) {
        return res.status(400).json({ mensagem: "Campos obrigatórios ausentes ou inválidos." });
    }
    
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const updateCampanhaQuery = `
            UPDATE campanhas
            SET nome = $1, descricao = $2, data_inicio = $3, data_fim = $4, meta_vendas = $5, condicoes = $6
            WHERE id = $7;
        `;
        const campanhaResult = await client.query(updateCampanhaQuery, [nome, descricao, data_inicio, data_fim, meta_vendas, JSON.stringify(condicoes || []), id]);

        if (campanhaResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensagem: 'Campanha não encontrada.' });
        }

        await client.query('DELETE FROM campanha_produtos WHERE campanha_id = $1', [id]);

        const produtosQuery = 'INSERT INTO campanha_produtos (campanha_id, produto_id) VALUES ($1, $2)';
        for (const produtoId of produtos) {
            await client.query(produtosQuery, [id, produtoId]);
        }

        await client.query('COMMIT');
        res.status(200).json({ mensagem: 'Campanha atualizada com sucesso.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar campanha:', error);
        res.status(500).json({ mensagem: 'Erro interno ao atualizar a campanha.' });
    } finally {
        client.release();
    }
});

router.delete('/:id', autenticarToken, autorizarAdmin, async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ mensagem: 'ID da campanha não fornecido.' });
    }

    const client = await db.getClient();

    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM campanha_produtos WHERE campanha_id = $1', [id]);
        const deleteCampanhaResult = await client.query('DELETE FROM campanhas WHERE id = $1', [id]);

        if (deleteCampanhaResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensagem: 'Campanha não encontrada.' });
        }
        await client.query('COMMIT');
        res.status(200).json({ mensagem: 'Campanha excluída com sucesso.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao excluir campanha:', error);
        res.status(500).json({ mensagem: 'Erro interno ao excluir a campanha.' });
    } finally {
        client.release();
    }
});

router.get('/banner-ativo', autenticarToken, async (req, res) => {
    try {
        const query = `
        SELECT id, nome, imagem_url
        FROM campanhas
        WHERE NOW() BETWEEN data_inicio AND data_fim
        ORDER BY data_inicio DESC
        LIMIT 1;
        `;
        const { rows } = await db.query(query);

        if (rows.length === 0) {
            return res.json(null)
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Erro ao buscar campanha para o banner:', error);
        res.status(500).json({ mensagem: 'Erro interno ao buscar dados do banner.' });
    }
});

router.get('/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            SELECT
                c.*,
                (SELECT json_agg(cp.produto_id)
                FROM campanha_produtos cp
                WHERE cp.campanha_id = c.id) as produtos_ids
            FROM campanhas c
            WHERE c.id = $1;
        `;
        
        const { rows } = await db.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Campanha não encontrada.' });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(`Erro ao buscar campanha com ID ${id}:`, error);
        res.status(500).json({ mensagem: 'Erro interno ao buscar a campanha.' });
    }
});

router.get('/:id/progresso', autenticarToken, async (req, res) => {
    const { id } = req.params;
    const { tipo, id_vendedor_bling } = req.usuario;

    try {
        const campanhaRes = await db.query('SELECT data_inicio, data_fim, meta_vendas FROM campanhas WHERE id = $1', [id]);

        if (campanhaRes.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Campanha não encontrada.' });
        }
        const campanha = campanhaRes.rows[0];
        const { data_inicio, data_fim, meta_vendas } = campanha;

        let vendasQuery = '';
        let queryParams = [];

        if (tipo === 'admin') {
            queryParams = [data_inicio, data_fim];
            vendasQuery = `
                SELECT SUM(total - valor_frete) as total_vendido
                FROM cache_pedidos
                WHERE
                    data_pedido BETWEEN $1 AND $2 AND
                    status_id <> 12;
            `;
        } else if (tipo === 'vendedor' && id_vendedor_bling) {
            queryParams = [id_vendedor_bling, data_inicio, data_fim];
            vendasQuery = `
                SELECT SUM(total - valor_frete) as total_vendido
                FROM cache_pedidos
                WHERE
                    vendedor_id = $1 AND
                    data_pedido BETWEEN $2 AND $3 AND
                    status_id <> 12;
            `;
        } else {
            return res.json({ vendasAtuais: 0, metaVendas: parseFloat(meta_vendas), progressoPercentual: 0});
        }

        const vendasRes = await db.query(vendasQuery, queryParams);
        const vendasAtuais = parseFloat(vendasRes.rows[0].total_vendido) || 0;

        let progressoPercentual = 0;
        if (meta_vendas && meta_vendas > 0) {
            progressoPercentual = (vendasAtuais / parseFloat(meta_vendas)) * 100;
        }

        res.json({
            vendasAtuais,
            metaVendas: parseFloat(meta_vendas),
            progressoPercentual,
        });

    } catch (error) {
        console.error(`Erro ao calcular progresso da campanha ${id} para o vendedor ${vendedorId}:`, error);
        res.status(500).json({ mensagem: 'Erro interno ao calcular o progresso.' });
    }
});

module.exports = router;