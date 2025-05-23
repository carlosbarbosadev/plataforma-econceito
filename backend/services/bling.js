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

    console.log('Iniciando busca de TODOS os contatos do Bling (sem filtro de CNPJ por enquanto)...');

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

    console.log(`Busca finalizada. Total de ${todosOsContatos.length} contatos encontrados (sem filtro de CNPJ).`);
    return todosOsContatos; // Retorna TODOS os contatos buscados
}

module.exports = { fetchClientes, refreshBlingAccessToken };
