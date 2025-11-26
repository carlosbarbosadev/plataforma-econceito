const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');
const { criarClienteBling, fetchDetalhesContato, atualizarClienteBling } = require('../services/bling');

const { parseBlingError } = require('../services/blingErrorHandler');

router.get('/', autenticarToken, async (req, res) => {
    console.log(`Rota GET /api/clientes (CACHE) acessada por: ${req.usuario.email}`);

    const searchTerm = req.query.search || '';
    const idVendedorBling = req.usuario.id_vendedor_bling;
    const tipoUsuario = req.usuario.tipo;

    try {
        let queryText;
        const queryParams = [];

        const termoGeral = `%${searchTerm}%`;

        const apenasNumeros = searchTerm.replace(/\D/g, '');

        const termoParaDocumento = apenasNumeros.length > 0 ? `%${apenasNumeros}%` : termoGeral;

        if (tipoUsuario === 'admin') {
            queryText = `
                SELECT * FROM cache_clientes
                WHERE (
                    nome ILIKE $1 OR
                    documento ILIKE $1 OR
                    documento ILIKE $2
                )
                ORDER BY nome ASC
            `;
            queryParams.push(termoGeral, termoParaDocumento);
        } else {
            queryText = `
                SELECT * FROM cache_clientes
                WHERE vendedor_id = $1
                AND (
                    nome ILIKE $2 OR
                    documento ILIKE $2 OR
                    documento ILIKE $3
                )
                ORDER BY nome ASC
            `;
            queryParams.push(idVendedorBling, termoGeral, termoParaDocumento);
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

router.get('/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;
    const { id_vendedor_bling: idVendedorBling, tipo: tipoUsuario } = req.usuario

    console.log(`Rota GET /api/clientes/${id} acessada por: ${req.usuario.email}`);

    try {
        const queryPermissao = "SELECT vendedor_id, data_cadastro, infocontato, observacoes FROM cache_clientes WHERE id = $1";
        const { rows } = await db.query(queryPermissao, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Cliente não encontrado.' })
        }

        const clienteDoCache = rows[0];

        if (tipoUsuario !== 'admin' && clienteDoCache.vendedor_id !== idVendedorBling) {
            return res.status(403).json({ mensagem: 'Você não tem permissão para ver este cliente.' });
        }

        const clienteDetalhado = await fetchDetalhesContato(id)
        
        const clienteCompleto = {
            ...clienteDetalhado,
            data_cadastro: clienteDoCache.data_cadastro,
            infocontato: clienteDoCache.infocontato,
            observacoes: clienteDoCache.observacoes
        };

        res.json(clienteCompleto);

    } catch (error) {
        console.error(`Falha crítica na rota GET /api/clientes/${id}:`, error.message);

        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }

        if (!res.headersSent) {
            res.status(500).json({ mensagem: `Falha ao buscar detalhes do cliente: ${error.message}` });
        }
    }
});

router.post('/', autenticarToken, async (req, res) => {
    console.log('Rota POST /api/clientes recebida.');
    try {
        const dadosDoFormulario = req.body;
        const idVendedorBling = req.usuario.id_vendedor_bling;

        const { infocontato, ...payloadParaBling } = dadosDoFormulario;

        payloadParaBling.vendedor = { id: idVendedorBling };

        const respostaCriacao = await criarClienteBling(payloadParaBling);
        const novoId = respostaCriacao.data.id;

        if (!novoId) {
            throw new Error('Bling não retornou um ID para o clinte criado.');
        }
        console.log(`Cliente criado no Bling com ID: ${novoId}. Buscando detalhes completos...`);

        const clienteDetalhado = await fetchDetalhesContato(novoId);

        const dataDeCadastro = new Date();

        const queryInsertCache = `
            INSERT INTO cache_clientes (id, nome, tipo_pessoa, documento, email, vendedor_id, fone, cidade, data_cadastro, infocontato, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
                nome = EXCLUDED.nome, tipo_pessoa = EXCLUDED.tipo_pessoa, documento = EXCLUDED.documento,
                email = EXCLUDED.email, vendedor_id = EXCLUDED.vendedor_id, fone = EXCLUDED.fone, cidade = EXCLUDED.cidade,
                data_cadastro = EXCLUDED.data_cadastro, infocontato = EXCLUDED.infocontato, observacoes = EXCLUDED.observacoes, updated_at = NOW()
        `;
        const params = [
            clienteDetalhado.id,
            clienteDetalhado.nome,
            clienteDetalhado.tipo,
            clienteDetalhado.numeroDocumento,
            clienteDetalhado.email,
            clienteDetalhado.vendedor?.id || idVendedorBling,
            clienteDetalhado.telefone || clienteDetalhado.celular || null,
            clienteDetalhado.endereco?.geral?.municipio || null,
            dataDeCadastro,
            dadosDoFormulario.infocontato || null,
            dadosDoFormulario.observacoes || null
        ];
        await db.query(queryInsertCache, params);
        console.log(`Cache local atualizado com o novo cliente ID: ${clienteDetalhado.id}`);

        res.status(201).json(clienteDetalhado);

    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            const blingErrorData = error.response.data;

            console.error(`Erro da API Bling (Status ${status}):`, JSON.stringify(blingErrorData));

            const formattedError = parseBlingError(blingErrorData);

            res.status(status).json(formattedError);

        } else {
            console.error('Erro interno na rota POST /api/clientes:', error.message);
            res.status(500).json({ message: error.message || 'Falha ao criar novo cliente.' });
        }
    }
});

router.put('/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;
    const dadosDoFormulario = req.body;
    const { id_vendedor_bling: idVendedorBling, tipo: tipoUsuario } = req.usuario;

    try {
        const {
            infocontato,
            observacoes,
            data_cadastro,
            id: idDoCorpo,
            ...payloadParaBling
        } = dadosDoFormulario;
        
        await atualizarClienteBling(id, payloadParaBling);

        const dadosDoBling = {
            nome: payloadParaBling.nome,
            tipo_pessoa: payloadParaBling.tipo,
            documento: payloadParaBling.numeroDocumento,
            email: payloadParaBling.email,
            fone: payloadParaBling.telefone || payloadParaBling.celular || null,
            cidade: payloadParaBling.endereco?.geral?.municipio || null
        };

        const dadosInternos = {
            infocontato: infocontato,
            observacoes: observacoes
        };

        const queryUpdateCache = `
            UPDATE cache_clientes SET
                nome = $1, tipo_pessoa = $2, documento = $3, email = $4,
                fone = $5, cidade = $6, infocontato = $7, observacoes = $8,
                updated_at = NOW()
            WHERE id= $9
        `;

        const params = [
            dadosDoBling.nome,
            dadosDoBling.tipo_pessoa,
            dadosDoBling.documento,
            dadosDoBling.email,
            dadosDoBling.fone,
            dadosDoBling.cidade,
            dadosInternos.infocontato,
            dadosInternos.observacoes,
            id
        ];

        await db.query(queryUpdateCache, params);

        const clienteCompleto = {
            ...payloadParaBling,
            id: id,
            infocontato: dadosInternos.infocontato,
            observacoes: dadosInternos.observacoes,
            data_cadastro: data_cadastro
    };

        res.json(clienteCompleto);

    } catch (error) {
        if (error.response && error.response.data) {
            console.error(`Erro da API Bling (PUT ${id}):`, JSON.stringify(error.response.data));
            const formattedError = parseBlingError(error.response.data);
            return res.status(error.response.status).json(formattedError);
        }
        
        console.error(`Falha crítica na rota PUT /api/clientes/${id}:`, error.message);
        if (!res.headersSent) {
            res.status(500).json({ mensagem: `Falha ao atualizar cliente: ${error.message}` });
        }
    }
});

module.exports = router;