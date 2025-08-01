const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');
const { criarClienteBling, fetchDetalhesContato } = require('../services/bling');

router.get('/', autenticarToken, async (req, res) => {
    console.log(`Rota GET /api/clientes (CACHE) acessada por: ${req.usuario.email}`);

    const searchTerm = req.query.search || '';
    const idVendedorBling = req.usuario.id_vendedor_bling;
    const tipoUsuario = req.usuario.tipo;

    try {
        let queryText;
        const queryParams = [];

        if (tipoUsuario === 'admin') {
            queryText = "SELECT * FROM cache_clientes WHERE (nome ILIKE $1 OR documento ILIKE $1) ORDER BY nome ASC";
            queryParams.push(`%${searchTerm}%`);
        } else {
            queryText = "SELECT * FROM cache_clientes WHERE vendedor_id = $1 AND (nome ILIKE $2 OR documento ILIKE $2) ORDER BY nome ASC";
            queryParams.push(idVendedorBling, `%${searchTerm}%`);
        }

        const { rows: clientesDoBanco } = await db.query(queryText, queryParams);

        const clientesFormatados = clientesDoBanco.map(cliente => ({
            ...cliente,
            numeroDocumento: cliente.documento,
            telefone: cliente.fone,
            endereco: {
                geral: {
                    municipio: cliente.cidade
                }
            }
        }));

        console.log(`Retornando ${clientesFormatados.length} clientes do cache.`);
        res.json(clientesFormatados);

    } catch (error) {
        console.error("Falha crítica na rota GET /api/clientes (CACHE):", error.message);
        if (!res.headersSent) {
            res.status(500).json({ mensagem: `Falha ao processar requisição de clientes: ${error.message}` });
        }
    }   
});

router.post('/', autenticarToken, async (req, res) => {
    console.log('Rota POST /api/clientes recebida.');
    try {
        const dadosDoFormulario = req.body;
        const idVendedorBling = req.usuario.id_vendedor_bling;

        const payloadParaBling = {
            ...dadosDoFormulario,
            vendedor: { id: idVendedorBling }
        };

        const respostaCriacao = await criarClienteBling(payloadParaBling);
        const novoId = respostaCriacao.data.id;

        if (!novoId) {
            throw new Error('Bling não retornou um ID para o clinte criado.');
        }
        console.log(`Cliente criado no Bling com ID: ${novoId}. Buscando detalhes completos...`);

        const clienteDetalhado = await fetchDetalhesContato(novoId);

        const queryInsertCache = `
            INSERT INTO cache_clientes (id, nome, tipo_pessoa, documento, email, vendedor_id, fone, cidade)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
                nome = EXCLUDED.nome, tipo_pessoa = EXCLUDED.tipo_pessoa, documento = EXCLUDED.documento,
                email = EXCLUDED.email, vendedor_id = EXCLUDED.vendedor_id, fone = EXCLUDED.fone, cidade = EXCLUDED.cidade, updated_at = NOW()
        `;
        const params = [
            clienteDetalhado.id,
            clienteDetalhado.nome,
            clienteDetalhado.tipo,
            clienteDetalhado.numeroDocumento,
            clienteDetalhado.email,
            clienteDetalhado.vendedor?.id || idVendedorBling,
            clienteDetalhado.telefone || clienteDetalhado.celular || null,
            clienteDetalhado.endereco?.geral?.municipio || null
        ];
        await db.query(queryInsertCache, params);
        console.log(`Cache local atualizado com o novo cliente ID: ${clienteDetalhado.id}`);

        res.status(201).json(clienteDetalhado);

    } catch (error) {
        console.error('Erro na rota POST /api/clientes:', error.message);
        res.status(500).json({ mensagem: error.message || 'Falha ao criar novo cliente.' });
    }
});

module.exports = router;