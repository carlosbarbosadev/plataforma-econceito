const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');

router.get('/pedidos-para-envio', autenticarToken, async (req, res) => {
    console.log(`Rota GET api/expedicao/pedidos-para-envio acessada por: ${req.usuario.email}`);
    try {
        const termoBusca = req.query.search || '';
        const queryParams = [];
        let paramIndex = 1;

        let whereClauses = ['cp.status_id IN (6, 464197)'];

        if (termoBusca.trim()) {
            whereClauses.push(`(cp.cliente_nome ILIKE $${paramIndex} OR cp.numero::text ILIKE $${paramIndex} OR u.nome ILIKE $${paramIndex})`);
            queryParams.push(`%${termoBusca}%`);
            paramIndex++;
        }
        
        const whereString = `WHERE ${whereClauses.join(' AND ')}`;

        const query = `
            SELECT
                cp.id,
                cp.numero,
                cp.status_id,
                TO_CHAR(cp.data_pedido, 'DD/MM/YYYY') AS data_pedido,
                cp.cliente_nome,
                cp.total,
                ss.kanban_column,
                u.nome AS vendedor_nome,
                ss.acknowledged,
                CASE
                    WHEN (ss.observacoes_expedicao IS NOT NULL AND ss.observacoes_expedicao <> '')
                    THEN TRUE
                    ELSE FALSE
                END AS has_observation
            FROM
                cache_pedidos AS cp
            LEFT JOIN
                shipment_status AS ss ON cp.id = ss.order_id
            LEFT JOIN
                usuarios AS u ON cp.vendedor_id = u.id_vendedor_bling
            ${whereString}
            ORDER BY
                cp.data_pedido ASC;
        `;

        const { rows: pedidosParaEnvio } = await db.query(query, queryParams);

        const pedidosFormatados = pedidosParaEnvio.map(p => {
            let colunaInicial;

            if (p.kanban_column) {
                colunaInicial = p.kanban_column;
            } else {
                if (p.status_id === 464197) {
                    colunaInicial = 'natal';
                } else {
                    colunaInicial = 'em-aberto'
                }
            }

            return {
                id: p.id,
                numero: p.numero,
                data_pedido: p.data_pedido,
                cliente_nome: p.cliente_nome,
                total: parseFloat(p.total),
                kanban_column: colunaInicial,
                vendedor_nome: p.vendedor_nome,
                has_observation: p.has_observation,
                acknowledged: p.acknowledged,
            };
        });

        res.json(pedidosFormatados);

    } catch (error) {
        console.error(`Erro na rota /api/expedicao/pedidos-para-envio:`, error.message);
        res.status(500).json({ mensagem: `Falha ao buscar pedidos para expedição: ${error.message}` });
    }
});

router.put('/status/:orderId', autenticarToken, async (req, res) => {
    const { orderId } = req.params;
    const { newColumn, observacoes } = req.body;

    if (!newColumn && typeof observacoes === 'undefined') {
        return res.status(400).json({ mensagem: 'Nenhum dado para atualizar foi fornecido.' });
    }

    try {
        let query;
        let queryParams;
        let successMessage;

        if (typeof observacoes !== 'undefined') {
            query = `
                INSERT INTO shipment_status (order_id, observacoes_expedicao, kanban_column, updated_at)
                VALUES ($1, $2, 'em-aberto', NOW())
                ON CONFLICT (order_id) DO UPDATE SET
                    observacoes_expedicao = EXCLUDED.observacoes_expedicao,
                    updated_at = NOW();
            `;
            queryParams = [orderId, observacoes];
            successMessage = `Observações do pedido ${orderId} salvas com sucesso.`;
        }

        else if (newColumn) {
            query = `
            INSERT INTO shipment_status (order_id, kanban_column, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (order_id) DO UPDATE SET
                kanban_column = EXCLUDED.kanban_column,
                updated_at = NOW();
            `;
            queryParams = [orderId, newColumn];
            successMessage = `Pedido ${orderId} movido para ${newColumn} com sucesso.`;
        }
        
        await db.query(query, queryParams);
        res.status(200).json({ mensagem: successMessage });

    } catch (error) {
        console.error(`Erro ao atualizar dados de expedição do pedido ${orderId}:`, error.message);
        res.status(500).json({ mensagem: 'Falha ao atualizar os dados de expedição.' });
    }
});

router.post('/acknowledge/:orderId', autenticarToken, async (req, res) => {
    const { orderId } = req.params;
    
    try {
        const checkQuery = 'SELECT * FROM shipment_status WHERE order_id = $1';
        const { rows } = await db.query(checkQuery, [orderId]);

        if (rows.length > 0) {
            const updateQuery = `
                UPDATE shipment_status
                SET acknowledged = TRUE, updated_at = NOW()
                WHERE order_id = $1;
            `;
            await db.query(updateQuery, [orderId]);
        } else {
            const pedidoQuery = 'SELECT status_id FROM cache_pedidos WHERE id = $1';
            const pedidoResult = await db.query(pedidoQuery, [orderId]);

            if (pedidoResult.rows.length === 0) {
                return res.status(404).json({ mensagem: 'Pedido não encontrado no cache.' });
            }
            
            const statusId = pedidoResult.rows[0].status_id;

            let defaultColumn = 'em-aberto';
            if (statusId === 464197) {
                defaultColumn = 'natal';
            }

            const insertQuery = `
                INSERT INTO shipment_status (order_id, kanban_column, acknowledged, updated_at)
                VALUES ($1, $2, TRUE, NOW());
            `;
            await db.query(insertQuery, [orderId, defaultColumn]);
        }

        res.status(200).json({ mensagem: `Pedido ${orderId} marcado como visto com sucesso.` });

    } catch (error) {
        console.error(`Erro ao marcar pedido ${orderId} com visto:`, error.message);
        res.status(500).json({ mensagem: 'Falha ao marcar pedido com visto.' });
    }
});

module.exports = router;