require('dotenv').config();
const axios = require('axios');
const db = require('../db');

const BLING_CLIENT_ID = process.env.BLING_CLIENT_ID;
const BLING_CLIENT_SECRET = process.env.BLING_CLIENT_SECRET;
const BLING_TOKEN_URL = 'https://www.bling.com.br/Api/v3/oauth/token';
const BLING_API_V3_URL = 'https://api.bling.com.br/Api/v3';
let isRefreshing = false;

async function getAccessToken(nomeConta = 'conceitofestas') {
    const { rows } = await db.query(
        'SELECT access_token FROM bling_tokens WHERE nome_conta = $1',
        [nomeConta]
    );

    if (rows.length === 0 || !rows[0].access_token) {
        throw new Error(`Access Token da conta '${nomeConta}' não encontrado.`);
    }

    return rows[0].access_token;
}


async function refreshBlingAccessToken(nomeConta = 'conceitofestas') {
    console.log(`Tentando renovar o Access Token do Bling para a conta: ${nomeConta}...`);

    let clientId, clientSecret;

    if (nomeConta === 'conceitofestas') {
        clientId = process.env.BLING_CLIENT_ID;
        clientSecret = process.env.BLING_CLIENT_SECRET;
    } else if (nomeConta === 'concept') {
        clientId = process.env.BLING_CLIENT_ID_CONCEPT;
        clientSecret = process.env.BLING_CLIENT_SECRET_CONCEPT;
    } else {
        throw new Error(`Nome de conta desconhecido: ${nomeConta}`);
    }

    if (!clientId || !clientSecret) {
        throw new Error(`Credenciais (Client ID/Secret) não configuradas no .env para a conta: ${nomeConta}`);
    }

    const { rows } = await db.query(
        'SELECT refresh_token FROM bling_tokens WHERE nome_conta = $1',
        [nomeConta]
    );

    if (rows.length === 0 || !rows[0].refresh_token) {
        throw new Error(`Refresh Token da conta '${nomeConta}' não encontrado no banco.`);
    }

    const currentRefreshToken = rows[0].refresh_token;

    const base64Credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    console.log(`[DEBUG] Tentando renovar conta: ${nomeConta}`);
    console.log(`[DEBUG] Usando Client ID final: ...${clientId.slice(-4)}`);

    try {
        const response = await axios.post(process.env.BLING_TOKEN_URL || 'https://www.bling.com.br/Api/v3/oauth/token', 
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: currentRefreshToken,
            }), {
            headers: {
                'Authorization': `Basic ${base64Credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        const newAccessToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token;

        if (!newAccessToken) {
            throw new Error('Falha ao obter o novo access_token do Bling.');
        }

        const updateQuery = `
            UPDATE bling_tokens 
            SET access_token = $1, refresh_token = $2, updated_at = NOW() 
            WHERE nome_conta = $3
        `;
        
        await db.query(updateQuery, [newAccessToken, newRefreshToken || currentRefreshToken, nomeConta]);
        
        console.log(`Tokens da conta '${nomeConta}' renovados com sucesso!`);
        return newAccessToken;

    } catch (error) {
        console.error(`Erro CRÍTICO ao renovar token da conta ${nomeConta}:`, error.response?.data || error.message);
        throw new Error(`Falha CRÍTICA ao renovar token da conta ${nomeConta}.`);
    }
}

/**
 * Função central que faz a chamada à API, com renovação automática de token.
 */
async function blingApiCall(requestConfig, nomeConta = 'conceitofestas') {
    try {
        const accessToken = await getAccessToken(nomeConta);
        
        requestConfig.headers = {
            ...requestConfig.headers,
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
        };
        return await axios(requestConfig);

    } catch (error) {
        if (error.response && error.response.status === 401) {
            if (!isRefreshing) {
                isRefreshing = true;
                try {
                    console.warn(`Token expirado para a conta ${nomeConta}. Iniciando rotina de renovação para ${requestConfig.url}...`);
                    
                    const newAccessToken = await refreshBlingAccessToken(nomeConta);
                    
                    requestConfig.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return await axios(requestConfig);
                } finally {
                    isRefreshing = false;
                }
            } else {
                console.log('Aguardando renovação de token que já está em andamento...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                return blingApiCall(requestConfig, nomeConta);
            }
        }
        throw error;
    }
}

async function fetchProdutosPorSituacao(criterio) {
    console.log(`Buscando produtos com situacao [${criterio}]...`);
    const produtos = [];
    let pagina = 1;
    while (true) {
        try {
            const params = {
                pagina: pagina,
                limite: 100,
                criterio: criterio
            };

            if (criterio === 2) {
                params.estoque = 'S';
            }

            const response = await blingApiCall({
                method: 'get',
                url: `${BLING_API_V3_URL}/produtos`,
                params: params
            });
            const produtosDaPagina = response.data.data;
            if (produtosDaPagina && produtosDaPagina.length > 0) {
                produtos.push(...produtosDaPagina);
                if (produtosDaPagina.length < 100) break;
                pagina++;
                await new Promise(resolve => setTimeout(resolve, 350));
            } else {
                break;
            }
        } catch (error) {
            console.error(`Erro ao buscar produtos (${criterio}) do Bling na página ${pagina}:`, error.response?.data || error.message);
            throw new Error(`Falha na API do Bling ao buscar produtos ${criterio}.`);
        }
    }
    console.log(`Busca (${criterio}) finalizada. Total de ${produtos.length} produtos.`);
    return produtos;
}

async function fetchProdutos() {
    console.log('Iniciando busca completa de produtos do Bling para o cache...');
    
    const produtosAtivos = await fetchProdutosPorSituacao('2');
    
    const produtosInativos = await fetchProdutosPorSituacao('3');

    const todosOsProdutos = [...produtosAtivos, ...produtosInativos];

    console.log(`Busca de produtos finalizada. Total de ${todosOsProdutos.length} produtos encontrados (Ativos: ${produtosAtivos.length}, Inativos: ${produtosInativos.length}).`);
    return todosOsProdutos;
}

async function fetchTodosOsContatos() {
    console.log('Bling Service: Buscando TODOS os contatos (clientes)...');
    const todosOsContatos = [];
    let pagina = 1;
    while (true) {
        try {
            const response = await blingApiCall({
                method: 'get',
                url: `${BLING_API_V3_URL}/contatos`,
                params: { pagina, limite: 100 }
            });
            const contatosDaPagina = response.data.data;
            if (contatosDaPagina && contatosDaPagina.length > 0) {
                todosOsContatos.push(...contatosDaPagina);
                if (contatosDaPagina.length < 100) break;
                pagina++;
                await new Promise(resolve => setTimeout(resolve, 350));
            } else {
                break;
            }
        } catch (erro) {
            console.error(`Erro ao buscar contatos na página ${pagina}:`, erro.response?.data || erro.message);
            throw new Error("Falha ao buscar contatos no ERP.");
        }
    }
    console.log(`Busca de contatos finalizada. Total de ${todosOsContatos.length} contatos.`);
    return todosOsContatos;
}

async function fetchDetalhesContato(contatoId, nomeConta = 'conceitofestas') {
    const response = await blingApiCall({
        method: 'get',
        url: `${BLING_API_V3_URL}/contatos/${contatoId}`
    }, nomeConta);
    return response.data.data;
}

async function criarClienteBling(dadosCliente, nomeConta = 'conceitofestas') {
    const response = await blingApiCall({
        method: 'post',
        url: `${BLING_API_V3_URL}/contatos`,
        data: dadosCliente,
        headers: { 'Content-Type': 'application/json' }
    }, nomeConta);
    return response.data;
}

async function buscarContatoPorDocumento(documento, nomeConta = 'conceitofestas') {
    const documentoLimpo = documento.replace(/\D/g, '');
    if (!documentoLimpo) return null;

    try {
        const response = await blingApiCall({
            method: 'get',
            url: `${process.env.BLING_API_V3_URL || 'https://api.bling.com.br/Api/v3'}/contatos`,
            params: { numero_documento: documentoLimpo } 
        }, nomeConta);

        if (response.data && response.data.data && Array.isArray(response.data.data)) {
            
            response.data.data.forEach(c => {
                const docBling = c.numeroDocumento ? c.numeroDocumento.replace(/\D/g, '') : 'SEM DOC';
                console.log(`🕵️ Comparando: Buscado(${documentoLimpo}) vs Bling(${docBling}) - Nome: ${c.nome}`);
            });
            // -------------------------

            const contatoCerto = response.data.data.find(c => {
                const docDoBling = c.numeroDocumento ? c.numeroDocumento.replace(/\D/g, '') : '';
                return docDoBling === documentoLimpo;
            });

            if (contatoCerto) {
                return contatoCerto;
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

async function atualizarClienteBling(contatoId, dadosCliente) {
    const response = await blingApiCall({
        method: 'put',
        url: `${BLING_API_V3_URL}/contatos/${contatoId}`,
        data: dadosCliente,
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data.data;
}

async function fetchPedidosVendas(idVendedorParaFiltrar = null) {
    const todosOsPedidos = [];
    let pagina = 1;
    while(true) {
        try {
            const params = { pagina, limite: 100, composicao: 'true' };
            if (idVendedorParaFiltrar) {
                params.idVendedor = idVendedorParaFiltrar;
            }
            const response = await blingApiCall({
                method: 'get',
                url: `${BLING_API_V3_URL}/pedidos/vendas`,
                params
            });
            const pedidosDaPagina = response.data.data;
            if (pedidosDaPagina && pedidosDaPagina.length > 0) {
                todosOsPedidos.push(...pedidosDaPagina);
                if (pedidosDaPagina.length < 100) break;
                pagina++;
                await new Promise(resolve => setTimeout(resolve, 350));
            } else {
                break;
            }
        } catch(error) {
            console.error(`Erro ao buscar pedidos do Bling na página ${pagina}:`, error.response?.data || error.message);
            throw new Error("Falha na comunicação com a API do Bling ao buscar pedidos.");
        }
    }
    console.log(`Busca de pedidos finalizada. Total de ${todosOsPedidos.length} pedidos encontrados.`);
    return todosOsPedidos;
}

async function fetchDetalhesPedidoVenda(idPedido) {
    const response = await blingApiCall({
        method: 'get',
        url: `${BLING_API_V3_URL}/pedidos/vendas/${idPedido}`
    });
    return response.data.data;
}

async function criarPedidoVenda(dadosDoPedido, nomeConta = 'conceitofestas') {
    const response = await blingApiCall({
        method: 'post',
        url: `${BLING_API_V3_URL}/pedidos/vendas`,
        data: dadosDoPedido,
        headers: { 'Content-Type': 'application/json' }
    }, nomeConta);

    return response.data;
}

async function atualizarPedidoNoBling(pedidoId, pedidoEditadoDoFrontend) {
    try {
        const pedidoOriginalDoBling = await fetchDetalhesPedidoVenda(pedidoId);

        const statusOriginal = pedidoOriginalDoBling.situacao.id;
        const statusNovo = pedidoEditadoDoFrontend.situacao.id;

        if (statusNovo !== statusOriginal) {
            console.log(`[blingService] Detectada mudança de status de ${statusOriginal} para ${statusNovo}.`);
            await alterarSituacaoPedidoBling(pedidoId, statusNovo);
        }

        if (pedidoOriginalDoBling.contato.id === pedidoEditadoDoFrontend.contato.id && 
            pedidoOriginalDoBling.contato.nome !== pedidoEditadoDoFrontend.contato.nome) {
            const contatoOriginalCompleto = await fetchDetalhesContato(pedidoEditadoDoFrontend.contato.id);
            const payloadContato = { ...contatoOriginalCompleto, nome: pedidoEditadoDoFrontend.contato.nome };
            await blingApiCall({
                method: 'put',
                url: `${BLING_API_V3_URL}/contatos/${pedidoEditadoDoFrontend.contato.id}`,
                data: payloadContato,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const subtotal = pedidoEditadoDoFrontend.itens.reduce((acc, item) => acc + (item.valor * item.quantidade), 0);
        const percentualDesconto = pedidoEditadoDoFrontend.desconto?.valor || 0;
        const valorDoDescontoEmReais = (subtotal * percentualDesconto) / 100;
        const totalFinal = subtotal - valorDoDescontoEmReais;

        const itensFormatados = pedidoEditadoDoFrontend.itens.map(item => {
            const itemPayload = {
                produto: { id: item.produto.id },
                quantidade: item.quantidade,
                valor: item.valor,
                codigo: item.codigo,
                descricao: item.descricao,
            };
            if (item.id > 0) {
                itemPayload.id = item.id;
            }
            return itemPayload
        });

        const numeroDeParcelas = pedidoEditadoDoFrontend.parcelas.length;
        const valorPorParcela = numeroDeParcelas > 0 ? (totalFinal / numeroDeParcelas) : totalFinal;

        const parcelasFormatadas = pedidoEditadoDoFrontend.parcelas.map(p => {
            const parcelaPayload = {
                dataVencimento: p.dataVencimento,
                valor: parseFloat(valorPorParcela.toFixed(2)),
                formaPagamento: { id: p.formaPagamento.id },
                observacoes: p.observacoes || ''
            };
            if (p.id > 0) {
                parcelaPayload.id = p.id;
            }
            return parcelaPayload;
        });

        const payloadFinal = {
            ...pedidoEditadoDoFrontend,
            itens: itensFormatados,
            parcelas: parcelasFormatadas,
            total: totalFinal,
            observacoesInternas: pedidoEditadoDoFrontend.observacoesInternas,
        };

        delete payloadFinal.situacao;

        const response = await blingApiCall({
            method: 'put',
            url: `${BLING_API_V3_URL}/pedidos/vendas/${pedidoId}`,
            data: payloadFinal,
            headers: { 'Content-Type': 'application/json' }
        });

        return response.data;

    } catch (error) {
        console.error('ERRO DETALHADO DA API DO BLING (ATUALIZAÇÃO):');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Erro:', error.message);
        }
        throw error;
    }
}

async function fetchFormasPagamento() {
    const response = await blingApiCall({
        method: 'get',
        url: `${BLING_API_V3_URL}/formas-pagamentos`
    });
    return response.data.data || [];
}

/**
 * @params {string|number} pedidoId O ID do pedido a ser atualizado
 * @params {number} statusId O novo ID da situação
 */

async function alterarSituacaoPedidoBling(pedidoId, statusId) {
    console.log(`[blingService] Atualizando status do pedido ${pedidoId} para o ID ${statusId}`);
    
    const response = await blingApiCall({
        method: 'patch',
        url: `${BLING_API_V3_URL}/pedidos/vendas/${pedidoId}/situacoes/${statusId}`,
        data: {}
    });;

    console.log(`[blingService] Status do pedido ${pedidoId} atualizado com sucesso no Bling.`);
    return response.data;
}

async function buscarIdProdutoPorSku(sku, nomeConta = 'concept') {
    const skuLimpo = String(sku).trim();
    
    if (!skuLimpo) return null;

    try {
        // Usa blingApiCall para garantir renovação de token automática
        const response = await blingApiCall({
            method: 'get',
            url: `${BLING_API_V3_URL}/produtos`,
            params: {
                codigo: skuLimpo,
                limite: 1 // Só precisamos de 1 para pegar o ID
            }
        }, nomeConta);

        if (response.data && response.data.data && response.data.data.length > 0) {
            return response.data.data[0].id;
        }
        
        return null;

    } catch (error) {
        console.error(`[blingService] Erro ao buscar ID do SKU ${skuLimpo} na conta ${nomeConta}:`, error.message);
        return null; // Retorna null para o sistema saber que não achou e tratar
    }
}

module.exports = {
    refreshBlingAccessToken,
    fetchProdutos,
    fetchProdutosPorSituacao,
    fetchTodosOsContatos,
    fetchDetalhesContato,
    criarClienteBling,
    fetchPedidosVendas,
    fetchDetalhesPedidoVenda,
    criarPedidoVenda,
    atualizarPedidoNoBling,
    fetchFormasPagamento,
    alterarSituacaoPedidoBling,
    atualizarClienteBling,
    getAccessToken,
    refreshBlingAccessToken,
    buscarContatoPorDocumento,
    blingApiCall,
    buscarIdProdutoPorSku
};