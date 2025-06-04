require('dotenv').config();
const axios = require('axios');

// Variáveis para armazenar os tokens em memória
let currentAccessToken = process.env.BLING_ACCESS_TOKEN;
let currentRefreshToken = process.env.BLING_REFRESH_TOKEN;

const BLING_CLIENT_ID = process.env.BLING_CLIENT_ID;
const BLING_CLIENT_SECRET = process.env.BLING_CLIENT_SECRET;
const BLING_TOKEN_URL = 'https://www.bling.com.br/Api/v3/oauth/token';

async function refreshBlingAccessToken() {
    console.log('Tentando renovar o Access Token do Bling...');
    if (!currentRefreshToken) {
        currentRefreshToken = process.env.BLING_REFRESH_TOKEN;
        if (!currentRefreshToken) {
            throw new Error('Refresh Token do Bling não encontrado. Não é possível renovar o access token.');
        }
    }

    const base64Credentials = Buffer.from(`${BLING_CLIENT_ID}:${BLING_CLIENT_SECRET}`).toString('base64');

    try {
        const response = await axios.post(BLING_TOKEN_URL, new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: currentRefreshToken,
        }), {
            headers: {
                'Authorization': `Basic ${base64Credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const newAccessToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token;

        console.log('NOVO access Token OBTIDO PELA RENOVAÇÃO:', newAccessToken);

        if (!newAccessToken) {
            throw new Error('Falha ao obter o novo access_token do Bling na resposta de refresh.');
        }

        console.log('Access Token do Bling renovado com sucesso!');
        currentAccessToken = newAccessToken; // Atualiza o token em memória

        if (newRefreshToken && newRefreshToken !== currentRefreshToken) { 
            console.log('Novo Refresh Token recebido do Bling.');
            console.log('VALOR DO NOVO REFRESH TOKEN:', newRefreshToken);
            currentRefreshToken = newRefreshToken;
            // ATENÇÃO: Salve este novo 'currentRefreshToken' no seu .env manualmente ou em um DB
            process.env.BLING_REFRESH_TOKEN = currentRefreshToken;
        }
        
        process.env.BLING_ACCESS_TOKEN = currentAccessToken; 
        return currentAccessToken;

    } catch (error) {
        console.error('Erro CRÍTICO ao tentar renovar o Access Token do Bling:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        // Se o refresh token estiver inválido/expirado, o Bling retornará um erro aqui.
        // Isso exigiria uma re-autenticação manual.
        currentAccessToken = null; 
        throw new Error(`Falha CRÍTICA ao renovar token do Bling: ${error.response?.data?.error_description || error.message}. Reautenticação manual pode ser necessária.`);
    }
}

async function fetchClientes(retryCount = 0) {
    // Garante que os tokens mais recentes do process.env sejam carregados no início
    if (retryCount === 0) { 
        currentAccessToken = process.env.BLING_ACCESS_TOKEN;
        currentRefreshToken = process.env.BLING_REFRESH_TOKEN;
    }
    
    if (!currentAccessToken) {
        console.error('Erro: Access Token do Bling não disponível no início de fetchClientes.');
        throw new Error('Erro de configuração: Access Token do Bling não encontrado.');
    }
    if (!currentRefreshToken) {
        console.warn('Aviso: Refresh Token do Bling não disponível no início de fetchClientes. A renovação automática pode falhar.');
    }

    const todosOsContatos = []; // Vamos armazenar todos os contatos aqui
    let pagina = 1;
    const limitePorPagina = 100; 

    console.log('Iniciando busca de TODOS os contatos do Bling');

    while (true) {
        const url = `https://api.bling.com.br/Api/v3/contatos?pagina=${pagina}&limite=${limitePorPagina}`;
        try {
            console.log(`Buscando contatos - Página: ${pagina} com Access Token: ${currentAccessToken ? 'presente' : 'AUSENTE'}`);
            
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${currentAccessToken}`,
                    'Accept': 'application/json',
                },
            });

            const contatosDaPagina = response.data.data;

            // Log para depurar a estrutura do primeiro contato da página (opcional, pode remover depois)
            // if (contatosDaPagina && contatosDaPagina.length > 0) {
            //     console.log('DEBUG: Estrutura do primeiro contato da página atual:', JSON.stringify(contatosDaPagina[0], null, 2));
            // }

            if (contatosDaPagina && contatosDaPagina.length > 0) {
                todosOsContatos.push(...contatosDaPagina); // Adiciona TODOS os contatos da página
                console.log(`Recebidos ${contatosDaPagina.length} contatos da página ${pagina}. Total parcial: ${todosOsContatos.length}`);

                if (contatosDaPagina.length < limitePorPagina) {
                    console.log('Última página de contatos alcançada.');
                    break; 
                }
                pagina++;
                await new Promise(resolve => setTimeout(resolve, 350)); // Delay para não exceder o rate limit
            } else {
                console.log(`Nenhum contato novo encontrado na página ${pagina}. Fim da busca.`);
                break;
            }
        } catch (error) {
            if (error.response && error.response.status === 401 && retryCount < 1) {
                console.warn(`Access Token expirado ou inválido durante busca na página ${pagina}. Tentando renovar...`);
                try {
                    await refreshBlingAccessToken(); 
                    console.log(`Token renovado. Re-tentando a página ${pagina} automaticamente.`);
                    continue; 
                } catch (refreshError) {
                    console.error('Falha DEFINITIVA ao renovar o token durante a paginação:', refreshError.message);
                    throw refreshError;
                }
            }

            let errorMessage = `Erro ao buscar dados do Bling (Página ${pagina}).`;
            if (error.response) {
                const blingErrorData = error.response.data;
                console.error(`Erro detalhado da API Bling V3 (Página ${pagina}, Status ${error.response.status}):`, JSON.stringify(blingErrorData, null, 2));
                errorMessage = `Falha na API Bling (Página ${pagina}): ${blingErrorData?.error?.description || blingErrorData?.error?.message || `Status ${error.response.status}`}`;
            } else if (error.request) {
                console.error(`Erro de rede ou sem resposta da API Bling V3 (Página ${pagina}):`, error.message);
                errorMessage = `Falha de conexão com a API Bling (Página ${pagina}).`;
            } else {
                console.error(`Erro ao configurar requisição Bling V3 (Página ${pagina}):`, error.message);
                errorMessage = `Erro interno ao processar requisição Bling (Página ${pagina}): ${error.message}`;
            }
            throw new Error(errorMessage);
        }
    }

    console.log(`Busca finalizada. Total de ${todosOsContatos.length} contatos encontrados`);
    return todosOsContatos; // Retorna TODOS os contatos buscados
}

async function fetchPedidosVendas(idVendedorParaFiltrar = null, retryCount = 0) {
    if (retryCount === 0) { 
        currentAccessToken = process.env.BLING_ACCESS_TOKEN;
        currentRefreshToken = process.env.BLING_REFRESH_TOKEN;
    }
    
    if (!currentAccessToken) {
        console.error('Erro: Access Token do Bling não disponível no início de fetchPedidosVendas.');
        throw new Error('Erro de configuração: Access Token do Bling não encontrado.');
    }
    if (!currentRefreshToken) {
        console.warn('Aviso: Refresh Token do Bling não disponível no início de fetchPedidosVendas. A renovação automática pode falhar.');
    }

    const todosOsPedidos = [];
    let pagina = 1;
    const limitePorPagina = 100; // Verifique o limite padrão/máximo para pedidos no Bling

    let logMessage = 'Iniciando busca de Pedidos de Venda do Bling';
    let baseUrlForApi = `https://api.bling.com.br/Api/v3/pedidos/vendas`; // Endpoint base

    if (idVendedorParaFiltrar) {
        logMessage += ` para o vendedor ID: ${idVendedorParaFiltrar}`;
    }
    console.log(logMessage + ' (para inspecionar estrutura)...');

    while (true) {
        // Monta a URL com os parâmetros de paginação e o filtro de vendedor (se houver)
        let url = `${baseUrlForApi}?pagina=${pagina}&limite=${limitePorPagina}`;
        if (idVendedorParaFiltrar) {
            url += `&idVendedor=${idVendedorParaFiltrar}`;
        }
        
        try {
            console.log(`Buscando Pedidos de Venda - URL: ${url} com Access Token: ${currentAccessToken ? 'presente' : 'AUSENTE'}`);
            
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${currentAccessToken}`,
                    'Accept': 'application/json',
                },
            });

            const pedidosDaPagina = response.data.data;

            if (pedidosDaPagina && pedidosDaPagina.length > 0) {

                todosOsPedidos.push(...pedidosDaPagina);
                console.log(`Recebidos ${pedidosDaPagina.length} pedidos da página ${pagina}. Total parcial: ${todosOsPedidos.length}`);

                if (pedidosDaPagina.length < limitePorPagina) {
                    console.log('Última página de pedidos alcançada (recebidos menos que o limite).');
                    break; 
                }
                pagina++;
                await new Promise(resolve => setTimeout(resolve, 350)); // Delay para não exceder o rate limit
            } else {
                console.log(`Nenhum pedido novo encontrado na página ${pagina}. Fim da busca.`);
                break;
            }
        } catch (error) {
            if (error.response && error.response.status === 401 && retryCount < 1) {
                console.warn(`Access Token expirado ou inválido durante busca de pedidos na página ${pagina}. Tentando renovar...`);
                try {
                    await refreshBlingAccessToken(); 
                    console.log(`Token renovado. Re-tentando a página ${pagina} de pedidos automaticamente.`);
                    continue; // Tenta a mesma página novamente com o novo token
                } catch (refreshError) {
                    console.error('Falha DEFINITIVA ao renovar o token durante a paginação de pedidos:', refreshError.message);
                    // Propaga o erro do refresh, pois não há mais o que fazer automaticamente.
                    throw refreshError; 
                }
            }

            // Se não for um erro 401 para refresh, ou se o retryCount já foi usado, ou se o refresh falhou antes
            let errorMessage = `Erro ao buscar pedidos do Bling (Página ${pagina}).`;
            if (error.response) {
                const blingErrorData = error.response.data;
                console.error(`Erro detalhado da API Bling V3 (Pedidos - Página ${pagina}, Status ${error.response.status}):`, typeof blingErrorData === 'string' ? blingErrorData : JSON.stringify(blingErrorData, null, 2));
                errorMessage = `Falha na API Bling (Pedidos - Página ${pagina}): ${typeof blingErrorData === 'object' && blingErrorData !== null && (blingErrorData.error?.description || blingErrorData.error?.message) ? (blingErrorData.error.description || blingErrorData.error.message) : `Status ${error.response.status}`}`;
            } else if (error.request) {
                console.error(`Erro de rede ou sem resposta da API Bling V3 (Pedidos - Página ${pagina}):`, error.message);
                errorMessage = `Falha de conexão com a API Bling (Pedidos - Página ${pagina}).`;
            } else {
                console.error(`Erro ao configurar requisição Bling V3 (Pedidos - Página ${pagina}):`, error.message);
                errorMessage = `Erro interno ao processar requisição Bling (Pedidos - Página ${pagina}): ${error.message}`;
            }
            throw new Error(errorMessage); // Propaga o erro para interromper a busca
        }
    }

    console.log(`Busca de pedidos finalizada. Total de ${todosOsPedidos.length} pedidos encontrados.`);
    return todosOsPedidos;
}

async function fetchProdutos(retryCount = 0) {
    if (retryCount === 0) {
        currentAccessToken = process.env.BLING_ACCESS_TOKEN;
        currentRefreshToken = process.env.BLING_REFRESH_TOKEN;
    }

    if (!currentAccessToken) {
        console.error('Erro: Access Token do Bling não disponível no início de fetchProdutos.');
        throw new Error('Erro de configuração: Access Token do Bling não encontrado.');
    }
    if (!currentRefreshToken) {
        console.warn('Aviso: Refresh Token do Bling não disponível no início de fetchProdutos. A renovação automática pode falhar.');
    }

    const todosOsProdutos = [];
    let pagina = 1;
    const limitePorPagina = 100;

    console.log('Iniciando busca de Produtos do Bling');

    while(true) {
        const url = `https://api.bling.com.br/Api/v3/produtos?pagina=${pagina}&limite=${limitePorPagina}`;
        try {
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${currentAccessToken}`,
                    'Accept': 'application/json',
                },
            });

            const produtosDaPagina = response.data.data;

            if (produtosDaPagina && produtosDaPagina.length > 0) {
                todosOsProdutos.push(...produtosDaPagina);

                if (produtosDaPagina.length < limitePorPagina) {
                    console.log('Última página de produtos alcançada.');
                    break;
                }
                pagina++;
                await new Promise(resolve => setTimeout(resolve, 350));
            } else {
                console.log(`Nenhum produto novo encontrado na página ${pagina}. Fim da busca`);
                break;
            }
        } catch (error) {
            if (error.response && error.response.status === 401 && retryCount < 1) {
                console.warn(`Access Token expirado ou inválido durante busca de produtos na página ${pagina}. Tentando renovar...`);
                try {
                    await refreshBlingAccessToken(); 
                    console.log(`Token renovado. Re-tentando a página ${pagina} de produtos automaticamente.`);
                    continue; 
                } catch (refreshError) {
                    console.error('Falha DEFINITIVA ao renovar o token durante a paginação de produtos:', refreshError.message);
                    throw refreshError;
                }
            }

            let errorMessage = `Erro ao buscar produtos do Bling (Página ${pagina}).`;
            if (error.response) {
                const blingErrorData = error.response.data;
                console.error(`Erro detalhado da API Bling V3 (Produtos - Página ${pagina}, Status ${error.response.status}):`, typeof blingErrorData === 'string' ? blingErrorData : JSON.stringify(blingErrorData, null, 2));
                errorMessage = `Falha na API Bling (Produtos - Página ${pagina}): ${typeof blingErrorData === 'object' && blingErrorData !== null && (blingErrorData.error?.description || blingErrorData.error?.message) ? (blingErrorData.error.description || blingErrorData.error.message) : `Status ${error.response.status}`}`;
            } else if (error.request) {
                console.error(`Erro de rede ou sem resposta da API Bling V3 (Produtos - Página ${pagina}):`, error.message);
                errorMessage = `Falha de conexão com a API Bling (Produtos - Página ${pagina}).`;
            } else {
                console.error(`Erro ao configurar requisição Bling V3 (Produtos - Página ${pagina}):`, error.message);
                errorMessage = `Erro interno ao processar requisição Bling (Produtos - Página ${pagina}): ${error.message}`;
            }
            throw new Error(errorMessage);
        }
    }

    console.log(`Busca de produtos finalizada. Total de ${todosOsProdutos.length} produtos encontrados.`);
    return todosOsProdutos;
}

async function criarPedidoVenda(dadosDoPedido, retryCount = 0) {
    if (retryCount === 0) { 
        currentAccessToken = process.env.BLING_ACCESS_TOKEN;
        // Não precisamos do refresh_token para esta chamada inicial, mas refreshBlingAccessToken o usa
    }
    if (!currentAccessToken) { throw new Error('Access Token do Bling não encontrado.'); }

    const url = `https://api.bling.com.br/Api/v3/pedidos/vendas`;
    console.log('Tentando criar pedido de venda no Bling com os dados:', JSON.stringify(dadosDoPedido, null, 2));

    try {
        const response = await axios.post(url, dadosDoPedido, { // Envia o objeto dadosDoPedido diretamente
            headers: {
                'Authorization': `Bearer ${currentAccessToken}`,
                'Content-Type': 'application/json', // Bling API v3 geralmente espera JSON no corpo
                'Accept': 'application/json',
            },
        });
        console.log('Pedido de venda criado com sucesso no Bling:', response.data);
        return response.data; // Retorna a resposta do Bling (geralmente o pedido criado)
    } catch (error) {
        if (error.response && error.response.status === 401 && retryCount < 1) {
            console.warn('Access Token expirado ao tentar criar pedido. Tentando renovar...');
            try {
                await refreshBlingAccessToken();
                console.log('Token renovado. Tentando criar o pedido novamente.');
                return criarPedidoVenda(dadosDoPedido, retryCount + 1); // Tenta novamente com o novo token
            } catch (refreshError) {
                console.error('Falha DEFINITIVA ao renovar token ao criar pedido:', refreshError.message);
                throw refreshError;
            }
        }
        // Log de erro mais detalhado
        const errorData = error.response?.data;
        const errorMessage = errorData?.error?.description || 
                             (Array.isArray(errorData?.errors) && errorData.errors[0]?.message) || // Bling às vezes retorna array de erros
                             error.message || 
                             'Erro desconhecido';
        console.error(`Erro ao criar pedido de venda no Bling (Status: ${error.response?.status}):`, JSON.stringify(errorData, null, 2) || error.message);
        throw new Error(`Falha ao criar pedido no Bling: ${errorMessage}`);
    }
}

async function fetchFormasPagamento(retryCount = 0) {
    if (retryCount === 0) {
        currentAccessToken = process.env.BLING_ACCESS_TOKEN;
        currentRefreshToken = process.env.BLING_REFRESH_TOKEN;
    }

    if (!currentAccessToken) {
        console.error('Erro: Access Token do Bling não disponível para fetchFormasPagamento.');
        throw new Error('Erro de configuração: Access Token do Bling não encontrado.');
    }

    if (!currentRefreshToken && retryCount === 0) {
        console.warn('Aviso: Refresh Token do Bling não disponível para fetchFormasPagamento. A renovação automática pode falhar.');
    }

    // Endpoint para formas de pagamento na API V3 do bling
    const url = `https://api.bling.com.br/Api/v3/formas-pagamentos`;

    console.log(`Buscando Formas de Pagamento do Bling com Access Token: ${currentAccessToken ? 'presente' : 'AUSENTE'}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${currentAccessToken}`,
                'Accept': 'application/json'
            },
        });

        const formasPagamento = response.data.data;

        if (formasPagamento && formasPagamento.length > 0) {
            console.log(`DEBUG: Estrutura COMPLETA da primeira Forma de Pagamento recebida (via console.dir):`);
            console.dir(formasPagamento[0], { depth: null });
        } else if (formasPagamento) {
            console.log('Nenhuma forma de pagamento encontrada ou a lista está vazia.');
        } else {
            console.warn('Resposta da API de formas de pagamento não continha um array de dados esperado:', response.data);
        }

        console.log(`Busca de formas de pagamento finalizada. Total de ${formasPagamento ? formasPagamento.length : 0} formas encontradas.`);
        return formasPagamento || []; // Retorna o array ou um array vazio se a resposta não for o esperado

    } catch (error) {
        if (error.response && error.response.status === 401 && retryCount < 1) {
            console.warn(`Access Token expirado ou inválido durante busca de Formas de Pagamento. Tentando renovar...`);
            try { 
                await refreshBlingAccessToken();
                console.log(`Token renovado. Re-tentando buscar Formas de Pagamento automaticamente.`);
                return fetchFormasPagamento(retryCount + 1);
            } catch (refreshError) {
                console.error('Falha DEFINITIVA ao renovar o token ao buscar Formas de Pagamento:', refreshError.message);
                throw refreshError;
            }
        }

        let errorMessage = `Erro ao buscar Formas de Pagamento do Bling.`;
        if (error.response) {
            const blingErrorData = error.response.data;
            console.error(`Erro detalhado da API Bling V3 (Formas de Pagamento - Status ${error.response.status}):`, typeof blingErrorData === 'string' ? blingErrorData : JSON.stringify(blingErrorData, null, 2));
            errorMessage = `Falha na API Bling (Formas de Pagamento): ${typeof blingErrorData === 'object' && blingErrorData !== null && (blingErrorData.error?.description || blingErrorData.error?.message) ? (blingErrorData.error.description || blingErrorData.error.message) : `Status ${error.response.status}`}`;
        } else if (error.request) {
            console.error(`Erro de rede ou sem resposta da API Bling V3 (Formas de Pagamento):`, error.message);
            errorMessage = `Falha de conexão com a API Bling (Formas de Pagamento).`;
        } else {
            console.error(`Erro ao configurar requisição Bling V3 (Formas de Pagamento):`, error.message);
            errorMessage = `Erro interno ao processar requisição Bling (Formas de Pagamento): ${error.message}`;
        }
        throw new Error(errorMessage);
    }
}

module.exports = { fetchClientes, refreshBlingAccessToken, fetchPedidosVendas, fetchProdutos, criarPedidoVenda, fetchFormasPagamento };