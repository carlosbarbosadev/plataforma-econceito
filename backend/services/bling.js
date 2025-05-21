// backend/services/bling.js
require('dotenv').config();
const axios = require('axios');

// Variáveis para armazenar os tokens em memória (serão inicializadas com o .env)
// Idealmente, para produção, você usaria um banco de dados ou um cache mais robusto
// para armazenar e atualizar esses tokens de forma persistente.
let currentAccessToken = process.env.BLING_ACCESS_TOKEN;
let currentRefreshToken = process.env.BLING_REFRESH_TOKEN;

const BLING_CLIENT_ID = process.env.BLING_CLIENT_ID;
const BLING_CLIENT_SECRET = process.env.BLING_CLIENT_SECRET;
const BLING_TOKEN_URL = 'https://www.bling.com.br/Api/v3/oauth/token';

async function refreshBlingAccessToken() {
    console.log('Tentando renovar o Access Token do Bling...');
    if (!currentRefreshToken) {
        throw new Error('Refresh Token do Bling não encontrado. Não é possível renovar o access token.');
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

        console.log('NOVO access Token OBTIDO PELA RENOVAÇÃO:', newAccessToken)

        if (!newAccessToken) {
            throw new Error('Falha ao obter o novo access_token do Bling na resposta de refresh.');
        }

        console.log('Access Token do Bling renovado com sucesso!');
        currentAccessToken = newAccessToken; // Atualiza o token em memória

        // Importante: Atualizar o refresh token se um novo for fornecido
        if (newRefreshToken) {
            console.log('Novo Refresh Token recebido do Bling.');
            console.log('VALOR DO NOVO REFRESH TOKEN:', newRefreshToken);
            currentRefreshToken = newRefreshToken;
            // ADICIONE ESTA LINHA ABAIXO PARA VER O NOVO TOKEN:
            process.env.BLING_REFRESH_TOKEN = currentRefreshToken; // Atualiza na instância atual
        }
        
        process.env.BLING_ACCESS_TOKEN = currentAccessToken; // Atualiza na instância atual
        return currentAccessToken;

    } catch (error) {
        console.error('Erro ao tentar renovar o Access Token do Bling:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        // Se o refresh token estiver inválido/expirado, o Bling retornará um erro aqui.
        // Isso exigiria uma re-autenticação manual (Etapa 1 e 2 que fizemos antes).
        throw new Error(`Falha ao renovar token do Bling: ${error.response?.data?.error_description || error.message}`);
    }
}

// Sua função fetchClientes (e outras que chamam o Bling) precisarão ser adaptadas
async function fetchClientes(retryCount = 0) { // Adicionamos retryCount para evitar loops infinitos
    if (!currentAccessToken) {
        console.error('Erro: Access Token do Bling não disponível.');
        // Tenta buscar do .env se currentAccessToken não estiver setado (primeira vez talvez)
        if (process.env.BLING_ACCESS_TOKEN) {
            currentAccessToken = process.env.BLING_ACCESS_TOKEN;
        } else {
             throw new Error('Erro de configuração: Access Token do Bling não encontrado.');
        }
    }
    if (!currentRefreshToken && process.env.BLING_REFRESH_TOKEN) {
        currentRefreshToken = process.env.BLING_REFRESH_TOKEN;
    }


    const url = 'https://api.bling.com.br/Api/v3/contatos';

    try {
        console.log('Tentando buscar clientes com o Access Token atual...');
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${currentAccessToken}`,
                'Accept': 'application/json',
            },
        });

        console.log('Resposta completa do Bling V3 (Status:', response.status, '):', JSON.stringify(response.data, null, 2));
        const contatos = response.data.data;

        if (!contatos || !Array.isArray(contatos)) {
            console.error('Formato inesperado da resposta da API Bling V3 para contatos:', response.data);
            throw new Error("Erro: Formato de resposta inesperado da API Bling V3. Esperado um array em 'data'.");
        }
        return contatos;

    } catch (error) {
        // Verifica se o erro é de token expirado/inválido (geralmente 401)
        if (error.response && error.response.status === 401 && retryCount < 1) { // Tenta renovar apenas uma vez
            console.warn('Access Token do Bling possivelmente expirado. Tentando renovar...');
            try {
                await refreshBlingAccessToken(); // Tenta renovar e atualiza currentAccessToken
                console.log('Token renovado. Tentando a chamada para fetchClientes novamente.');
                return fetchClientes(retryCount + 1); // Tenta a chamada original novamente
            } catch (refreshError) {
                console.error('Falha ao renovar o token e tentar novamente:', refreshError.message);
                // Se o refresh falhar, lança o erro do refresh.
                // Poderia ser que o refresh token também expirou, exigindo re-autenticação manual.
                throw new Error('Falha ao renovar token de acesso do Bling. Pode ser necessário reautenticar a aplicação.');
            }
        }

        // Para outros erros ou se o retry já aconteceu
        let errorMessage = 'Erro desconhecido ao buscar dados do Bling (V3).';
        if (error.response) {
            const blingErrorData = error.response.data;
            console.error('Erro detalhado da API Bling V3 (Status:', error.response.status, '):', JSON.stringify(blingErrorData, null, 2));
            errorMessage = `Falha na API Bling: ${blingErrorData?.error?.description || blingErrorData?.error?.message || `Status ${error.response.status}`}`;
        } else if (error.request) {
            console.error('Erro de rede ou sem resposta da API Bling V3:', error.message);
            errorMessage = 'Falha de conexão com a API Bling.';
        } else {
            console.error('Erro ao configurar requisição Bling V3:', error.message);
            errorMessage = `Erro interno ao processar requisição Bling: ${error.message}`;
        }
        throw new Error(errorMessage);
    }
}

module.exports = { fetchClientes, refreshBlingAccessToken }; // Exporte a nova função também, se quiser testá-la diretamente