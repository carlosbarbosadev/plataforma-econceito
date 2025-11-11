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
                CASE WHEN (ss.observacoes_expedicao IS NOT NULL AND ss.observacoes_expedicao <> '') THEN TRUE ELSE FALSE END AS has_observation,
                
                (
                    SELECT 
                        COUNT(*) FILTER (WHERE item.quantidade > COALESCE(prod.estoque_saldo_virtual, 0)) AS out_of_stock_count
                    FROM jsonb_to_recordset(cp.dados_completos_json->'itens') AS item(codigo text, quantidade numeric)
                    LEFT JOIN cache_produtos prod ON prod.codigo = item.codigo
                ) AS out_of_stock_count,
                
                (
                    (SELECT COUNT(*) FILTER (WHERE item.quantidade > COALESCE(prod.estoque_saldo_virtual, 0))
                     FROM jsonb_to_recordset(cp.dados_completos_json->'itens') AS item(codigo text, quantidade numeric)
                     LEFT JOIN cache_produtos prod ON prod.codigo = item.codigo) = 0
                ) AS is_fully_in_stock

            FROM
                cache_pedidos AS cp
            LEFT JOIN shipment_status AS ss ON cp.id = ss.order_id
            LEFT JOIN usuarios AS u ON cp.vendedor_id = u.id_vendedor_bling
            ${whereString}
            ORDER BY
                is_fully_in_stock DESC,
                cp.data_pedido ASC;
        `;

        const { rows: pedidosParaEnvio } = await db.query(query, queryParams);

        const pedidosFormatados = pedidosParaEnvio.map(p => {
            let colunaInicial = p.kanban_column || (p.status_id === 464197 ? 'natal' : 'em-aberto');

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
                isFullyInStock: p.is_fully_in_stock,
                outOfStockCount: parseInt(p.out_of_stock_count, 10),
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

    try {
        const checkQuery = 'SELECT order_id FROM shipment_status WHERE order_id = $1';
        const { rows } = await db.query(checkQuery, [orderId]);
        const recordExists = rows.length > 0;

        if (recordExists) {
            const fieldsToUpdate = [];
            const queryParams = [orderId]
            let paramIndex = 2;

            if (newColumn) {
                fieldsToUpdate.push(`kanban_column = $${paramIndex++}`);
                queryParams.push(newColumn);
            }
            if (observacoes !== undefined) {
                fieldsToUpdate.push(`observacoes_expedicao = $${paramIndex++}`);
                queryParams.push(observacoes);
            }

            const upsertQuery = `
                UPDATE shipment_status SET ${fieldsToUpdate.join(', ')}, updated_at = NOW()
                WHERE order_id = $1;
            `;

            await db.query(upsertQuery, queryParams);

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
            
            const finalColumn = newColumn || defaultColumn;
            const finalObservacoes = observacoes || '';

            const insertQuery = `
                INSERT INTO shipment_status (order_id, kanban_column, observacoes_expedicao, updated_at)
                VALUES ($1, $2, $3, NOW());
            `;
            await db.query(insertQuery, [orderId, finalColumn, finalObservacoes]);
        }

        if (newColumn && newColumn !== 'em-producao') {
            console.log(`Limpando itens de produção para o pedido ${orderId}...`);
            const deleteQuery = 'DELETE FROM production_items WHERE order_id = $1';
            await db.query(deleteQuery, [orderId]);
        }

        res.status(200).json({ mensagem: `Dados de expedição do pedido ${orderId} atualizados com sucesso.` });

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

router.post('/production-item', autenticarToken, async (req, res) => {
    const { orderId, productCode, quantity, isSelected } = req.body;

    try {
        if (isSelected) {
            const insertQuery = `
                INSERT INTO production_items (order_id, product_code, quantity)
                VALUES ($1, $2, $3)
                ON CONFLICT (order_id, product_code) DO NOTHING;
            `;
            await db.query(insertQuery, [orderId, productCode, quantity]);
            res.status(200).json({ mensagem: 'Item adicionado à lista de produção.' });
        } else {
            const deleteQuery = `
                DELETE FROM production_items
                WHERE order_id = $1 AND product_code = $2;
            `;
            await db.query(deleteQuery, [orderId, productCode]);
            res.status(200).json({ mensagem: 'Item removido da lista de produção.' });
        }
    } catch (error) {
        console.error('Erro ao atualizar a lista de produção:', error.message);
        res.status(500).json({ mensagem: 'Falha ao atualizar a lista de produção.' });
    }
});

router.get('/production-report', autenticarToken, async (req, res) => {
    try {
        const query = `
            SELECT
                pi.product_code,
                COALESCE(cp.nome, 'Descrição não encontrada') AS descricao,
                SUM(pi.quantity) as total_quantity
            FROM
                production_items AS pi
            LEFT JOIN
                cache_produtos AS cp ON pi.product_code = cp.codigo
            GROUP BY
                pi.product_code, cp.nome
            ORDER BY
                pi.product_code ASC;
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao gerar relatório de produção:', error.message);
        res.status(500).json({ mensagem: 'Falha ao gerar relatório de produção.' });
    }
});

router.get('/stock-demand-report', autenticarToken, async (req, res) => {
    try {
        const query = `
            WITH ItemsFromOrders AS (
                SELECT
                    (item_data->>'codigo')::text AS produto_codigo,
                    (item_data->>'quantidade')::integer AS quantidade
                FROM
                    cache_pedidos cp,
                    jsonb_array_elements(cp.dados_completos_json->'itens') AS item_data
                WHERE
                    cp.status_id IN (6, 464197)
                    AND (item_data->>'codigo') IS NOT NULL
                    AND (item_data->>'codigo') <> ''
            ),
            Demand AS (
                SELECT
                    produto_codigo,
                    SUM(quantidade) AS total_demand
                FROM
                    ItemsFromOrders
                GROUP BY
                    produto_codigo
            )
            SELECT
                d.produto_codigo AS product_code,
                COALESCE(prod.nome, 'Descrição não encontrada') AS description,
                d.total_demand::integer,
                COALESCE(prod.estoque_saldo_virtual, 0)::integer AS current_stock,
                GREATEST(0, d.total_demand - COALESCE(prod.estoque_saldo_virtual, 0))::integer AS needed_quantity
            FROM
                Demand d
            LEFT JOIN
                cache_produtos prod ON d.produto_codigo = prod.codigo
            ORDER BY
                needed_quantity DESC,
                product_code ASC;
        `;

        const { rows } = await db.query(query);
        res.json(rows);

    } catch (error) {
        console.error('Erro ao gerar relatório de estoque vs demanda:', error.message);
        res.status(500).json({ mensagem: 'Falha ao gerar relatório de estoque.' });
    }
});

module.exports = router;