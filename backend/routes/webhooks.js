const express = require('express');
const router = express.Router();
const db = require('../db');
const { fetchDetalhesPedidoVenda } = require('../services/bling');

router.post('/bling-estoque', async (req, res) => {
    console.log('--- WEBHOOK DE ESTOQUE DO BLING RECEBIDO! ---');

    try {
        const { data } = req.body;

        const produtoId = data?.produto?.id;
        const novoEstoque = data?.saldoVirtualTotal;

        if (produtoId && typeof novoEstoque !== 'undefined') {
            console.log(`Webhook: Atualizando estoque do produto ID ${produtoId} para ${novoEstoque}`);

            const query = `
                UPDATE cache_produtos
                SET estoque_saldo_virtual = $1, atualizado_em = NOW()
                WHERE id = $2;
            `;
            const values = [novoEstoque, produtoId];
            
            await db.query(query, values);

            console.log(`Webhook: Estoque do produto ID ${produtoId} atualizado no banco com sucesso.`);

        } else {
            console.log('Webhook de estoque recebido, mas os dados necessários (ID ou saldo) não foram encontrados.');
        }
    } catch (error) {
        console.error('Erro ao processar webhook de estoque:', error);
    }

    res.status(200).send('Notificação recebida');
});

router.post('/pedidos', async (req, res) => {
    console.log('--- WEBHOOK DE PEDIDO V3 RECEBIDO! ---');

    try {
        const { data } = req.body;
        const pedidoId = data?.id;

        if (!pedidoId) {
            console.log('Webhook de pedido recebido, mas não foi possível extrair o ID do pedido de req.body.data');
            return res.status(200).send('Webhook recebido, mas sem ID.');
        }

        console.log(`Processando webhook para o Pedido ID: ${pedidoId}`);

        const pedidoDetalhado = await fetchDetalhesPedidoVenda(pedidoId).catch(error => {
            if (error.response && error.response.status === 404) {
                return null;
            }
            throw error;
        });

        if (pedidoDetalhado) {
            const upsertQuery = `
                INSERT INTO cache_pedidos (
                    id, numero, data_pedido, data_saida, total, total_produtos, status_id, status_nome,
                    cliente_id, cliente_nome, cliente_documento, vendedor_id, observacoes, updated_at, dados_completos_json
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14)
                    ON CONFLICT (id) DO UPDATE SET
                        numero = EXCLUDED.numero, data_pedido = EXCLUDED.data_pedido, data_saida = EXCLUDED.data_saida,
                        total = EXCLUDED.total, total_produtos = EXCLUDED.total_produtos, status_id = EXCLUDED.status_id,
                        status_nome = EXCLUDED.status_nome, cliente_id = EXCLUDED.cliente_id, cliente_nome = EXCLUDED.cliente_nome,
                        cliente_documento = EXCLUDED.cliente_documento, vendedor_id = EXCLUDED.vendedor_id,
                        observacoes = EXCLUDED.observacoes, updated_at = NOW(), dados_completos_json = EXCLUDED.dados_completos_json;
            `;
            const params = [
                pedidoDetalhado.id, pedidoDetalhado.numero, pedidoDetalhado.data, pedidoDetalhado.dataSaida || null,
                pedidoDetalhado.total, pedidoDetalhado.totalProdutos, pedidoDetalhado.situacao.id, pedidoDetalhado.situacao.valor,
                pedidoDetalhado.contato.id, pedidoDetalhado.contato.nome, pedidoDetalhado.contato.numeroDocumento || null,
                pedidoDetalhado.vendedor?.id || null, pedidoDetalhado.observacoes || null, pedidoDetalhado
            ];
            await db.query(upsertQuery, params);
            console.log(`Pedido ID ${pedidoId} (criado/alterado) salvo no cache via webhook.`);
        } else {
            await db.query('DELETE FROM cache_pedido_itens WHERE pedido_id = $1', [pedidoId]);
            await db.query('DELETE FROM cache_pedidos WHERE id = $1', [pedidoId]);
            console.log(`Pedido ID ${pedidoId} excluído do cache via webhook.`);
        }

        res.status(200).send('Webhook de pedido processado com sucesso.');

     } catch (error) {
        console.error(`Erro ao processar webhook de pedido:`, error.message);
        res.status(200).send('Webhook recebido, mas houve um erro interno no processamento.');
     }
})

module.exports = router;
