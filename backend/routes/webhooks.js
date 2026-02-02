const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');
const { fetchDetalhesPedidoVenda, refreshBlingAccessToken, getAccessToken } = require('../services/bling');

router.post('/bling-estoque', async (req, res) => {
    res.status(200).send('Recebido');

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

});

router.post('/produtos', async (req, res) => {
    res.status(200).send('Recebido');

    const { data, eventType } = req.body;
    const itemWebhook = Array.isArray(data) ? data[0] : data;

    if (!itemWebhook || !itemWebhook.id) return;

    if (eventType === 'delete' || itemWebhook.situacao === 'E') {
         await db.query('DELETE FROM cache_produtos WHERE id = $1', [itemWebhook.id]);
         return;
    }

    try {
        let token = await getAccessToken(); 
        
        if (!token) return console.error('Sem token disponível no banco.');

        let produtoCompleto = null;

        try {
            const response = await axios.get(`https://www.bling.com.br/Api/v3/produtos/${itemWebhook.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            produtoCompleto = response.data.data;

        } catch (error) {
            if (error.response && error.response.status === 401) {
                
                const novoToken = await refreshBlingAccessToken();
                
                if (novoToken) {
                    const retryResponse = await axios.get(`https://www.bling.com.br/Api/v3/produtos/${itemWebhook.id}`, {
                        headers: { Authorization: `Bearer ${novoToken}` }
                    });
                    produtoCompleto = retryResponse.data.data;
                }
            } else {
                throw error;
            }
        }

        if (produtoCompleto) {
            const gtin = produtoCompleto.gtin || produtoCompleto.gtinEmbalagem || '';
            const query = `
                INSERT INTO cache_produtos (
                    id, codigo, nome, preco, gtin, imagem_url, dados_completos_json, atualizado_em
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    codigo = EXCLUDED.codigo,
                    nome = EXCLUDED.nome,
                    preco = EXCLUDED.preco,
                    gtin = EXCLUDED.gtin,
                    imagem_url = EXCLUDED.imagem_url,
                    dados_completos_json = EXCLUDED.dados_completos_json,
                    atualizado_em = NOW();
            `;
            const values = [
                produtoCompleto.id, produtoCompleto.codigo, produtoCompleto.nome,
                produtoCompleto.preco, gtin, produtoCompleto.imagemURL || '',
                JSON.stringify(produtoCompleto)
            ];
            await db.query(query, values);
            console.log(`Produto ${produtoCompleto.codigo} atualizado (ID: ${produtoCompleto.id})`);
        }

    } catch (error) {
        console.error(`Erro webhook produto ${itemWebhook.id}:`, error.message);
    }
});

router.post('/pedidos', async (req, res) => {
    res.status(200).send('Recebido');

    try {
        const { data } = req.body;
        const pedidoId = data?.id;

        if (!pedidoId) {
            console.log('Webhook pedido ignorado: Sem ID.');
            return; 
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
                    cliente_id, cliente_nome, cliente_documento, vendedor_id, observacoes, updated_at, dados_completos_json, valor_frete
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14, $15)
                    ON CONFLICT (id) DO UPDATE SET
                        numero = EXCLUDED.numero, data_pedido = EXCLUDED.data_pedido, data_saida = EXCLUDED.data_saida,
                        total = EXCLUDED.total, total_produtos = EXCLUDED.total_produtos, status_id = EXCLUDED.status_id,
                        status_nome = EXCLUDED.status_nome, cliente_id = EXCLUDED.cliente_id, cliente_nome = EXCLUDED.cliente_nome,
                        cliente_documento = EXCLUDED.cliente_documento, vendedor_id = EXCLUDED.vendedor_id,
                        observacoes = EXCLUDED.observacoes, updated_at = NOW(), dados_completos_json = EXCLUDED.dados_completos_json,
                        valor_frete = EXCLUDED.valor_frete;
            `;
            const params = [
                pedidoDetalhado.id, pedidoDetalhado.numero, pedidoDetalhado.data, pedidoDetalhado.dataSaida || null,
                pedidoDetalhado.total, pedidoDetalhado.totalProdutos, pedidoDetalhado.situacao.id, pedidoDetalhado.situacao.valor,
                pedidoDetalhado.contato.id, pedidoDetalhado.contato.nome, pedidoDetalhado.contato.numeroDocumento || null,
                pedidoDetalhado.vendedor?.id || null, pedidoDetalhado.observacoes || null, pedidoDetalhado,
                pedidoDetalhado.transporte?.frete || 0
            ];
            await db.query(upsertQuery, params);
            console.log(`Pedido ID ${pedidoId} (criado/alterado) salvo no cache via webhook.`);
        } else {
            await db.query('DELETE FROM cache_pedido_itens WHERE pedido_id = $1', [pedidoId]);
            await db.query('DELETE FROM cache_pedidos WHERE id = $1', [pedidoId]);
            console.log(`Pedido ID ${pedidoId} excluído do cache via webhook.`);
        }

     } catch (error) {
        console.error(`Erro ao processar webhook de pedido:`, error.message);
     }
})

module.exports = router;
