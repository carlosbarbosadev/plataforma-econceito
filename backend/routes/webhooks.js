const express = require('express');
const router = express.Router();
const db = require('../db');

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
})

module.exports = router;
