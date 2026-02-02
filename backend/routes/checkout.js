const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');
const { alterarSituacaoPedidoBling } = require('../services/bling');
const blingService = require('../services/bling');

const idCheckoutIncompleto = 718171;
const idEmAberto = 6;
const idCheckoutCompleto = 718183;
const idPascoa = 710186;
const idSaldoPendente = 722370;

router.get('/pedidos', autenticarToken, async (req, res) => {
    console.log(`Rota GET /api/checkout/pedidos acessada por: ${req.usuario.email}`);

    try {
        const query = `
            SELECT
                cp.id,
                cp.numero,
                cp.cliente_nome,
                cp.status_id,
                cp.status_nome,
                cp.dados_completos_json
            FROM cache_pedidos AS cp
            WHERE cp.status_id IN ($1, $2, $3)
            ORDER BY cp.numero ASC
            LIMIT 250
        `;

        const { rows: pedidos } = await db.query(query, [idEmAberto, idCheckoutIncompleto, idPascoa]);

        if (pedidos.length === 0) {
            return res.json([]);
        }

        const pedidosIds = pedidos.map(p => p.id);

        const progressoQuery = `
            SELECT pedido_id, sku, quantidade_conferida
            FROM checkout_conferencias
            WHERE pedido_id = ANY($1::bigint[])
        `;
        const { rows: progressos } = await db.query(progressoQuery, [pedidosIds]);

        const mapaProgresso = {};
        progressos.forEach(row => {
            const chave = `${row.pedido_id}_${row.sku}`;
            mapaProgresso[chave] = parseFloat(row.quantidade_conferida);
        });

        const pedidosFormatados = await Promise.all(pedidos.map(async (pedido) => {
            const dadosCompletos = pedido.dados_completos_json || {};
            const itensBling = dadosCompletos.itens || [];

            const itensFormatados = await Promise.all(itensBling.map(async (item) => {
                let produtoInfo = { gtin: null, imagem_url: null, estoque: 0 };

                try {
                    const produtoQuery = `
                        SELECT 
                            gtin,
                            imagem_url,
                            estoque_saldo_virtual
                        FROM cache_produtos 
                        WHERE codigo = $1
                    `;
                    const { rows } = await db.query(produtoQuery, [item.codigo]);
                    if (rows.length > 0) {
                        produtoInfo = {
                            gtin: rows[0].gtin,
                            imagem_url: rows[0].imagem_url,
                            estoque: parseFloat(rows[0].estoque_saldo_virtual) || 0
                        };
                    }
                } catch (err) {
                    console.error(`Erro ao buscar produto ${item.codigo}:`, err.message);
                }

                const chaveProgresso = `${pedido.id}_${item.codigo}`;
                const qtdSalva = mapaProgresso[chaveProgresso] || 0;

                const qtdTotal = Number(item.quantidade) || 0;
                const statusItem = qtdSalva >= qtdTotal ? 'ok' : 'pending';

                return {
                    sku: item.codigo || '',
                    ean: produtoInfo.gtin || '',
                    name: item.descricao || '',
                    imageUrl: produtoInfo.imagem_url || null,
                    quantityOrdered: qtdTotal,
                    quantityChecked: qtdSalva,
                    status: statusItem,
                    unitPrice: Number(item.valor) || 0,
                    stockAvailable: produtoInfo.estoque
                };
            }));

            return {
                id: String(pedido.id),
                orderNumber: String(pedido.numero),
                customerName: pedido.cliente_nome || 'Cliente não informado',
                status: pedido.status_nome || 'Pronto',
                statusId: pedido.status_id,
                notes: dadosCompletos.observacoes || '',
                items: itensFormatados
            };
        }));

        res.json(pedidosFormatados);

    } catch (error) {
        console.error('Erro na rota /api/checkout/pedidos:', error.message);
        res.status(500).json({ mensagem: `Falha ao buscar pedidos: ${error.message}` });
    }
});

router.get('/pedidos/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;
    console.log(`Rota GET /api/checkout/pedidos/${id} acessada por: ${req.usuario.email}`);

    try {
        const query = `
            SELECT
                cp.id,
                cp.numero,
                cp.cliente_nome,
                cp.status_id,
                cp.status_nome,
                cp.observacoes,
                cp.dados_completos_json
            FROM cache_pedidos AS cp
            WHERE cp.id = $1
        `;

        const { rows } = await db.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Pedido não encontrado' });
        }

        const pedido = rows[0];
        const dadosCompletos = pedido.dados_completos_json || {};
        const itensBling = dadosCompletos.itens || [];

        const progressoQuery = `
            SELECT sku, quantidade_conferida
            FROM checkout_conferencias
            WHERE pedido_id = $1
        `;
        const progressoResult = await db.query(progressoQuery, [pedido.id]);

        const mapaProgresso = {};
        progressoResult.rows.forEach(row => {
            mapaProgresso[row.sku] = parseFloat(row.quantidade_conferida);
        });

        const itensFormatados = await Promise.all(itensBling.map(async (item) => {
            let produtoInfo = { gtin: null, imagem_url: null, estoque: 0 };

            try {
                const produtoQuery = `
                    SELECT 
                        gtin,
                        imagem_url,
                        estoque_saldo_virtual
                    FROM cache_produtos
                    WHERE codigo = $1
                `;
                const prodResult = await db.query(produtoQuery, [item.codigo]);

                if (prodResult.rows.length > 0) {
                    produtoInfo = {
                        gtin: prodResult.rows[0].gtin,
                        imagem_url: prodResult.rows[0].imagem_url,
                        estoque: parseFloat(prodResult.rows[0].estoque_saldo_virtual) || 0
                    };
                }
            } catch (err) {
                console.error(`Erro ao buscar produto ${item.codigo}:`, err.message);
            }

            const qtdTotal = Number(item.quantidade) || 0;
            const qtdSalva = mapaProgresso[item.codigo] || 0;
            const statusItem = qtdSalva >= qtdTotal ? 'ok' : 'pending';

            return {
                sku: item.codigo || '',
                ean: produtoInfo.gtin || '',
                name: item.descricao || '',
                imageUrl: produtoInfo.imagem_url || null,
                quantityOrdered: qtdTotal,
                quantityChecked: qtdSalva,
                status: statusItem,
                unitPrice: Number(item.valor) || 0,
                stockAvailable: produtoInfo.estoque
            };
        }));

        const pedidoFormatado = {
            id: String(pedido.id),
            orderNumber: String(pedido.numero),
            customerName: pedido.cliente_nome || 'Cliente não informado',
            status: pedido.status_nome || 'Pronto',
            statusId: pedido.status_id,
            notes: pedido.observacoes || dadosCompletos.observacoes || '',
            items: itensFormatados
        };

        res.json(pedidoFormatado);

    } catch (error) {
        console.error(`Erro na rota /api/checkout/pedidos/${id}:`, error.message);
        res.status(500).json({ mensagem: `Falha ao buscar pedido: ${error.message}` });
    }
});


router.post('/conferir', autenticarToken, async (req, res) => {
    const { orderId, code, quantity = 1 } = req.body;

    console.log(`Conferência: Pedido ${orderId}, Código ${code}, Qtd ${quantity}`);

    if (!orderId || !code) {
        return res.status(400).json({ mensagem: 'orderId e code são obrigatórios' });
    }

    try {
        const pedidoQuery = `
            SELECT dados_completos_json 
            FROM cache_pedidos 
            WHERE id = $1
        `;
        const { rows } = await db.query(pedidoQuery, [orderId]);

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Pedido não encontrado' });
        }

        const dadosCompletos = rows[0].dados_completos_json || {};
        const itens = dadosCompletos.itens || [];

        const produtoQuery = `
            SELECT codigo, gtin
            FROM cache_produtos 
            WHERE codigo = $1 OR gtin = $1
        `;
        const prodResult = await db.query(produtoQuery, [code]);

        let codigoProduto = code;
        if (prodResult.rows.length > 0) {
            codigoProduto = prodResult.rows[0].codigo;
        }

        const itemNoPedido = itens.find(item =>
            item.codigo === codigoProduto || item.codigo === code
        );

        if (!itemNoPedido) {
            return res.status(404).json({
                mensagem: 'Produto não encontrado neste pedido',
                code: code
            });
        }

        res.json({
            success: true,
            item: {
                sku: itemNoPedido.codigo,
                name: itemNoPedido.descricao,
                quantityOrdered: Number(itemNoPedido.quantidade),
                quantityChecked: quantity
            }
        });

    } catch (error) {
        console.error('Erro na conferência:', error.message);
        res.status(500).json({ mensagem: `Falha na conferência: ${error.message}` });
    }
});

router.post('/salvar-parcial', autenticarToken, async (req, res) => {
    const { orderId, items } = req.body;

    if (!orderId || !items) return res.status(400).json({ mensagem: 'Dados incompletos' });

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE cache_pedidos
            SET
                status_id = $1,
                updated_at = NOW()
            WHERE id = $2`,
            [idCheckoutIncompleto, orderId]
        );

        for (const item of items) {
            if (item.quantityChecked > 0) {
                const query = `
                    INSERT INTO checkout_conferencias (pedido_id, sku, quantidade_conferida, atualizado_em)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (pedido_id, sku)
                    DO UPDATE SET
                        quantidade_conferida = EXCLUDED.quantidade_conferida,
                        atualizado_em = NOW();
                `;
                await client.query(query, [orderId, item.sku, item.quantityChecked]);
            } else {
                await client.query(
                    "DELETE FROM checkout_conferencias WHERE pedido_id = $1 AND sku = $2",
                    [orderId, item.sku]
                );
            }
        }

        await client.query('COMMIT');

        try {
            await alterarSituacaoPedidoBling(orderId, idCheckoutIncompleto);
        } catch (blingError) {
            console.error(`[checkout] Erro ao atualizar status no Bling (pedido ${orderId}):`, blingError.message);
            console.error(`[checkout] Detalhes do erro:`, JSON.stringify(blingError.response?.data, null, 2));
            console.error(`[checkout] Status HTTP:`, blingError.response?.status);
        }

        res.json({ success: true, message: 'Progresso salvo com segurança.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao salvar parcial:', error);
        res.status(500).json({ mensagem: 'Erro ao salvar.' });
    } finally {
        client.release();
    }
});

router.post('/finalizar', autenticarToken, async (req, res) => {
    const { orderId, items } = req.body;

    if (!orderId || !items) return res.status(400).json({ mensagem: 'Dados incompletos' });

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE cache_pedidos
            SET
                status_id = $1,
                updated_at = NOW()
            WHERE id = $2`,
            [idCheckoutCompleto, orderId]
        );

        await client.query(
            `DELETE FROM checkout_conferencias WHERE pedido_id = $1`,
            [orderId]
        );

        await client.query('COMMIT');

        try {
            await alterarSituacaoPedidoBling(orderId, idCheckoutCompleto);
            console.log(`[checkout] Pedido ${orderId} finalizado e atualizado no Bling para "Checkout Completo"`);
        } catch (blingError) {
            console.error(`[checkout] Erro ao finalizar no Bling (pedido ${orderId}):`, blingError.message);
            console.error(`[checkout] Detalhes do erro:`, JSON.stringify(blingError.response?.data, null, 2));
            console.error(`[checkout] Status HTTP:`, blingError.response?.status);
        }

        res.json({ success: true, message: 'Pedido finalizado com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao finalizar pedido:', error);
        res.status(500).json({ mensagem: 'Erro ao finalizar pedido.' });
    } finally {
        client.release();
    }
});

router.post('/substituir-produto', autenticarToken, async (req, res) => {
    const { orderId, oldSku, newProductSku } = req.body;

    console.log(`[checkout] Substituição: Pedido ${orderId}, SKU antigo: ${oldSku}, SKU novo: ${newProductSku}`);

    if (!orderId || !oldSku || !newProductSku) {
        return res.status(400).json({ mensagem: 'orderId, oldSku e newProductSku são obrigatórios' });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const pedidoQuery = `
            SELECT dados_completos_json 
            FROM cache_pedidos 
            WHERE id = $1
        `;
        const { rows: pedidoRows } = await client.query(pedidoQuery, [orderId]);

        if (pedidoRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensagem: 'Pedido não encontrado' });
        }

        const dadosCompletos = pedidoRows[0].dados_completos_json || {};
        const itens = dadosCompletos.itens || [];

        const itemAntigoIndex = itens.findIndex(item => item.codigo === oldSku);
        if (itemAntigoIndex === -1) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensagem: `Produto ${oldSku} não encontrado neste pedido` });
        }

        const itemAntigo = itens[itemAntigoIndex];
        const quantidadeOriginal = Number(itemAntigo.quantidade);

        const produtoQuery = `
            SELECT 
                id, 
                codigo, 
                nome, 
                preco, 
                gtin,
                imagem_url
            FROM cache_produtos 
            WHERE codigo = $1
        `;
        const { rows: produtoRows } = await client.query(produtoQuery, [newProductSku]);

        if (produtoRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensagem: `Produto ${newProductSku} não encontrado no catálogo` });
        }

        const novoProduto = produtoRows[0];

        const novoItem = {
            produto: { id: Number(novoProduto.id) },
            codigo: novoProduto.codigo,
            descricao: novoProduto.nome,
            quantidade: quantidadeOriginal,
            valor: parseFloat(novoProduto.preco) || 0,
            unidade: itemAntigo.unidade || 'UN'
        };

        const novosItens = [...itens];
        novosItens[itemAntigoIndex] = novoItem;

        const pedidoParaAtualizar = {
            ...dadosCompletos,
            itens: novosItens.map(item => ({
                produto: { id: item.produto?.id || item.produtoId },
                codigo: item.codigo,
                descricao: item.descricao,
                quantidade: Number(item.quantidade),
                valor: parseFloat(item.valor),
                unidade: item.unidade || 'UN'
            }))
        };

        if (!pedidoParaAtualizar.situacao) {
            pedidoParaAtualizar.situacao = { id: idCheckoutIncompleto };
        }
        await blingService.atualizarPedidoNoBling(orderId, pedidoParaAtualizar);

        const pedidoAtualizado = await blingService.fetchDetalhesPedidoVenda(orderId);

        const upsertQuery = `
            UPDATE cache_pedidos
            SET
                dados_completos_json = $1,
                total = $2,
                total_produtos = $3,
                updated_at = NOW()
            WHERE id = $4
        `;
        await client.query(upsertQuery, [
            pedidoAtualizado,
            pedidoAtualizado.total,
            pedidoAtualizado.totalProdutos,
            orderId
        ]);

        await client.query(
            `DELETE FROM checkout_conferencias WHERE pedido_id = $1 AND sku = $2`,
            [orderId, oldSku]
        );

        await client.query('COMMIT');

        console.log(`[checkout] Produto substituído com sucesso: ${oldSku} -> ${newProductSku}`);

        res.json({
            success: true,
            message: 'Produto substituído com sucesso',
            oldProduct: { sku: oldSku },
            newProduct: {
                sku: novoProduto.codigo,
                name: novoProduto.nome,
                unitPrice: parseFloat(novoProduto.preco) || 0,
                quantity: quantidadeOriginal
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[checkout] Erro ao substituir produto:', error.message);
        if (error.response?.data) {
            console.error('[checkout] Detalhe do erro Bling:', JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({ mensagem: `Falha ao substituir produto: ${error.message}` });
    } finally {
        client.release();
    }
});

router.post('/saldo-pendente', autenticarToken, async (req, res) => {
    const { orderId } = req.body;

    console.log(`[checkout] Criando saldo pendente para pedido ${orderId}`);

    if (!orderId) {
        return res.status(400).json({ mensagem: 'orderId é obrigatório' });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const pedidoQuery = `
            SELECT id, dados_completos_json 
            FROM cache_pedidos 
            WHERE id = $1
        `;
        const { rows: pedidoRows } = await client.query(pedidoQuery, [orderId]);

        if (pedidoRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensagem: 'Pedido não encontrado' });
        }

        const dadosCompletos = pedidoRows[0].dados_completos_json || {};
        const itensOriginais = dadosCompletos.itens || [];

        const progressoQuery = `
            SELECT sku, quantidade_conferida
            FROM checkout_conferencias
            WHERE pedido_id = $1
        `;
        const { rows: progressos } = await client.query(progressoQuery, [orderId]);

        const mapaProgresso = {};
        progressos.forEach(row => {
            mapaProgresso[row.sku] = parseFloat(row.quantidade_conferida);
        });

        const itensConferidos = [];
        const itensPendentes = [];

        for (const item of itensOriginais) {
            const qtdConferida = mapaProgresso[item.codigo] || 0;
            const qtdTotal = Number(item.quantidade) || 0;

            if (qtdConferida >= qtdTotal) {
                itensConferidos.push(item);
            } else if (qtdConferida > 0) {
                itensConferidos.push({ ...item, quantidade: qtdConferida });
                itensPendentes.push({ ...item, quantidade: qtdTotal - qtdConferida });
            } else {
                itensPendentes.push(item);
            }
        }

        if (itensPendentes.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ mensagem: 'Não há itens pendentes para criar saldo pendente' });
        }

        const dataHoje = new Date().toISOString().split('T')[0];

        const totalNovoPedido = itensPendentes.reduce((acc, item) => {
            return acc + (Number(item.quantidade) * parseFloat(item.valor));
        }, 0);
        const parcelasOriginais = dadosCompletos.parcelas || [];
        const parcelasNovas = parcelasOriginais.length > 0
            ? parcelasOriginais.map(p => ({
                dataVencimento: dataHoje,
                valor: totalNovoPedido / parcelasOriginais.length,
                formaPagamento: { id: p.formaPagamento?.id }
            }))
            : [{
                dataVencimento: dataHoje,
                valor: totalNovoPedido,
                formaPagamento: { id: parcelasOriginais[0]?.formaPagamento?.id || 0 }
            }];

        const novoPedidoPayload = {
            data: dataHoje,
            dataSaida: dataHoje,
            contato: dadosCompletos.contato,
            vendedor: dadosCompletos.vendedor,
            situacao: { id: idSaldoPendente },
            itens: itensPendentes.map(item => ({
                produto: { id: item.produto?.id },
                codigo: item.codigo,
                descricao: item.descricao,
                quantidade: Number(item.quantidade),
                valor: parseFloat(item.valor),
                unidade: item.unidade || 'UN'
            })),
            parcelas: parcelasNovas,
            observacoes: `Saldo pendente do pedido ${dadosCompletos.numero || orderId}`,
            observacoesInternas: dadosCompletos.observacoesInternas || ''
        };

        const respostaNovoPedido = await blingService.criarPedidoVenda(novoPedidoPayload);
        const novoPedidoId = respostaNovoPedido.data?.id;
        const novoPedidoNumero = respostaNovoPedido.data?.numero;

        console.log(`[checkout] Novo pedido de saldo pendente criado: ID ${novoPedidoId}, Número ${novoPedidoNumero}`);

        await new Promise(resolve => setTimeout(resolve, 500));

        const novoPedidoCompleto = await blingService.fetchDetalhesPedidoVenda(novoPedidoId);

        await client.query(`
            INSERT INTO cache_pedidos (
                id, numero, cliente_nome, cliente_id, cliente_documento,
                status_id, status_nome, data_pedido, data_saida,
                total, total_produtos, vendedor_id,
                dados_completos_json, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                dados_completos_json = EXCLUDED.dados_completos_json,
                total = EXCLUDED.total,
                total_produtos = EXCLUDED.total_produtos,
                updated_at = NOW()
        `, [
            novoPedidoId,
            novoPedidoCompleto.numero || novoPedidoNumero,
            novoPedidoCompleto.contato?.nome || dadosCompletos.contato?.nome || 'Cliente não informado',
            novoPedidoCompleto.contato?.id || dadosCompletos.contato?.id || null,
            novoPedidoCompleto.contato?.numeroDocumento || dadosCompletos.contato?.numeroDocumento || null,
            idSaldoPendente,
            'Saldo Pendente',
            dataHoje,
            dataHoje,
            novoPedidoCompleto.total || totalNovoPedido,
            novoPedidoCompleto.totalProdutos || totalNovoPedido,
            novoPedidoCompleto.vendedor?.id || dadosCompletos.vendedor?.id || null,
            novoPedidoCompleto
        ]);

        console.log(`[checkout] Novo pedido ${novoPedidoNumero} inserido no cache local`);

        if (itensConferidos.length > 0) {
            const pedidoOriginalAtualizado = {
                ...dadosCompletos,
                situacao: { id: idCheckoutIncompleto },
                itens: itensConferidos.map(item => ({
                    produto: { id: item.produto?.id },
                    codigo: item.codigo,
                    descricao: item.descricao,
                    quantidade: Number(item.quantidade),
                    valor: parseFloat(item.valor),
                    unidade: item.unidade || 'UN'
                }))
            };

            await new Promise(resolve => setTimeout(resolve, 500));

            await blingService.atualizarPedidoNoBling(orderId, pedidoOriginalAtualizado);
        }
        await new Promise(resolve => setTimeout(resolve, 500));

        const pedidoAtualizadoDoBling = await blingService.fetchDetalhesPedidoVenda(orderId);

        await client.query(`
            UPDATE cache_pedidos
            SET
                dados_completos_json = $1,
                total = $2,
                total_produtos = $3,
                updated_at = NOW()
            WHERE id = $4
        `, [
            pedidoAtualizadoDoBling,
            pedidoAtualizadoDoBling.total,
            pedidoAtualizadoDoBling.totalProdutos,
            orderId
        ]);

        for (const item of itensOriginais) {
            const qtdConferida = mapaProgresso[item.codigo] || 0;
            const qtdTotal = Number(item.quantidade) || 0;

            if (qtdConferida >= qtdTotal) {
                continue;
            } else if (qtdConferida > 0) {
                await client.query(
                    `UPDATE checkout_conferencias 
                     SET quantidade_conferida = $3, atualizado_em = NOW()
                     WHERE pedido_id = $1 AND sku = $2`,
                    [orderId, item.codigo, qtdConferida]
                );
            } else {
                await client.query(
                    `DELETE FROM checkout_conferencias WHERE pedido_id = $1 AND sku = $2`,
                    [orderId, item.codigo]
                );
            }
        }

        await client.query('COMMIT');

        console.log(`[checkout] Saldo pendente criado com sucesso. Pedido original ${orderId} atualizado.`);

        res.json({
            success: true,
            message: 'Saldo pendente criado com sucesso',
            novoPedido: {
                id: novoPedidoId,
                numero: novoPedidoNumero
            },
            itensMovidos: itensPendentes.length,
            itensRestantes: itensConferidos.length
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[checkout] Erro ao criar saldo pendente:', error.message);
        if (error.response?.data) {
            console.error('[checkout] Detalhe do erro Bling:', JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({ mensagem: `Falha ao criar saldo pendente: ${error.message}` });
    } finally {
        client.release();
    }
});

module.exports = router;