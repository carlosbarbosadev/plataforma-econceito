require('dotenv').config();
const axios = require('axios');
const db = require('../db');

const BLING_CLIENT_ID = process.env.BLING_CLIENT_ID;
const BLING_CLIENT_SECRET = process.env.BLING_CLIENT_SECRET;
const BLING_TOKEN_URL = 'https://www.bling.com.br/Api/v3/oauth/token';
const BLING_API_V3_URL = 'https://api.bling.com.br/Api/v3';
let isRefreshing = false;

async function getAccessToken() {
    const { rows } = await db.query('SELECT access_token FROM bling_tokens WHERE id = 1');
    if (rows.length === 0 || !rows[0].access_token) {
        throw new Error('Access Token não encontrado no banco de dados. Autenticação inicial necessária.');
    }
    return rows[0].access_token;
}

/**
 * Renova os tokens usando o refresh_token do banco e salva os novos tokens de volta no banco.
 */
async function refreshBlingAccessToken() {
    console.log('Tentando renovar o Access Token do Bling...');
    const { rows } = await db.query('SELECT refresh_token FROM bling_tokens WHERE id = 1');
    if (rows.length === 0 || !rows[0].refresh_token) {
        throw new Error('Refresh Token não encontrado no banco de dados.');
    }
    const currentRefreshToken = rows[0].refresh_token;

    const base64Credentials = Buffer.from(`${BLING_CLIENT_ID}:${BLING_CLIENT_SECRET}`).toString('base64');

    try {
        const response = await axios.post(BLING_TOKEN_URL, new URLSearchParams({
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
            UPDATE bling_tokens SET access_token = $1, refresh_token = $2, updated_at = NOW() WHERE id = 1
        `;
        await db.query(updateQuery, [newAccessToken, newRefreshToken || currentRefreshToken]);
        console.log('Tokens do Bling renovados e salvos no banco de dados com sucesso!');
        return newAccessToken;

    } catch (error) {
        console.error('Erro CRÍTICO ao tentar renovar o Access Token:', error.response?.data || error.message);
        throw new Error(`Falha CRÍTICA ao renovar token. Reautenticação manual pode ser necessária.`);
    }
}

/**
 * Função central que faz a chamada à API, com renovação automática de token.
 */
async function blingApiCall(requestConfig) {
    try {
        const accessToken = await getAccessToken();
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
                    console.warn(`Token expirado. Iniciando rotina de renovação para ${requestConfig.url}...`);
                    const newAccessToken = await refreshBlingAccessToken();
                    requestConfig.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return await axios(requestConfig);
                } finally {
                    isRefreshing = false;
                }
            } else {
                console.log('Aguardando renovação de token que já está em andamento...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                return blingApiCall(requestConfig);
            }
        }
        throw error;
    }
}

async function fetchProdutos() {
    console.log('Iniciando busca completa de produtos do Bling para o cache...');
    const todosOsProdutos = [];
    let pagina = 1;
    while (true) {
        try {
            const response = await blingApiCall({
                method: 'get',
                url: `${BLING_API_V3_URL}/produtos`,
                params: { pagina, limite: 100, estoque: 'S' }
            });
            const produtosDaPagina = response.data.data;
            if (produtosDaPagina && produtosDaPagina.length > 0) {
                todosOsProdutos.push(...produtosDaPagina);
                if (produtosDaPagina.length < 100) break;
                pagina++;
                await new Promise(resolve => setTimeout(resolve, 350));
            } else {
                break;
            }
        } catch (error) {
            console.error(`Erro ao buscar produtos do Bling na página ${pagina}:`, error.response?.data || error.message);
            throw new Error("Falha na comunicação com a API do Bling ao buscar produtos.");
        }
    }
    console.log(`Busca de produtos finalizada. Total de ${todosOsProdutos.length} produtos encontrados.`);
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

async function fetchDetalhesContato(contatoId) {
    const response = await blingApiCall({
        method: 'get',
        url: `${BLING_API_V3_URL}/contatos/${contatoId}`
    });
    return response.data.data;
}

async function criarClienteBling(dadosCliente) {
    const response = await blingApiCall({
        method: 'post',
        url: `${BLING_API_V3_URL}/contatos`,
        data: dadosCliente,
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
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

async function criarPedidoVenda(dadosDoPedido) {
    const response = await blingApiCall({
        method: 'post',
        url: `${BLING_API_V3_URL}/pedidos/vendas`,
        data: dadosDoPedido,
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
}

async function atualizarPedidoNoBling(pedidoId, pedidoEditadoDoFrontend) {
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
        console.log(`Contato ID ${pedidoEditadoDoFrontend.contato.id} atualizado com sucesso.`);
    }

    const subtotal = pedidoEditadoDoFrontend.itens.reduce((acc, item) => acc + (item.valor * item.quantidade), 0);
    
    const percentualDesconto = pedidoEditadoDoFrontend.desconto?.valor || 0;
    const valorDoDescontoEmReais = (subtotal * percentualDesconto) / 100;
    const totalFinal = subtotal - valorDoDescontoEmReais;

    const itensFormatados = pedidoEditadoDoFrontend.itens.map(item => ({
        produto: { id: item.produto.id },
        quantidade: item.quantidade,
        valor: item.valor,
        codigo: item.codigo,
        descricao: item.descricao,
        ...(item.id > 0 && { id: item.id })
    }));
    const payloadFinal = {
        ...pedidoEditadoDoFrontend,
        itens: itensFormatados,
        total: totalFinal,
        desconto: pedidoEditadoDoFrontend.desconto,
        parcelas: (pedidoEditadoDoFrontend.parcelas?.length > 0) ? [{ ...pedidoEditadoDoFrontend.parcelas[0], valor: totalFinal }] : []
    };

    delete payloadFinal.situacao;
    
    const response = await blingApiCall({
        method: 'put',
        url: `${BLING_API_V3_URL}/pedidos/vendas/${pedidoId}`,
        data: payloadFinal,
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
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

module.exports = {
    refreshBlingAccessToken,
    fetchProdutos,
    fetchTodosOsContatos,
    fetchDetalhesContato,
    criarClienteBling,
    fetchPedidosVendas,
    fetchDetalhesPedidoVenda,
    criarPedidoVenda,
    atualizarPedidoNoBling,
    fetchFormasPagamento,
    alterarSituacaoPedidoBling
};