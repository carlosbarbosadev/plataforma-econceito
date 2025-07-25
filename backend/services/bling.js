require('dotenv').config();
const axios = require('axios');
const db = require('../db');

// Variáveis de tokens 
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
        let url = `${baseUrlForApi}?pagina=${pagina}&limite=${limitePorPagina}&composicao=true`;
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
    if (!currentAccessToken) { throw new Error('Access Token do Bling não encontrado.'); }

    const todosOsProdutos = [];
    let pagina = 1;
    const limitePorPagina = 100;

    console.log('Iniciando busca completa de produtos do Bling para o cache...');

    while (true) {
        const url = `https://api.bling.com.br/Api/v3/produtos`;
        try {
            const response = await axios.get(url, {
                params: {
                    pagina: pagina,
                    limite: limitePorPagina,
                    estoque: 'S'
                },
                headers: {
                    "Authorization": `Bearer ${currentAccessToken}`,
                    "Accept": "application/json",
                },
            });

            const produtosDaPagina = response.data.data;

            if (pagina === 1 && produtosDaPagina && produtosDaPagina.length > 0) {
                console.log('--- ESTRUTURA DO PRIMEIRO PRODUTO DO BLING (v3) ---');
                console.log(JSON.stringify(produtosDaPagina[0], null, 2));
            }

            if (produtosDaPagina && produtosDaPagina.length > 0) {
                const produtosTransformados = produtosDaPagina.map(produto => ({
                    id: produto.id,
                    nome: produto.nome,
                    codigo: produto.codigo,
                    preco: parseFloat(produto.preco) || 0,
                    estoque: produto.estoque,
                    situacao: produto.situacao,
                    imagemURL: produto.imagemURL,
                }));
                todosOsProdutos.push(...produtosTransformados);

                if (produtosDaPagina.length < limitePorPagina) {
                    console.log("Última página de produtos alcançada.");
                    break;
                }
                pagina++;
                await new Promise(resolve => setTimeout(resolve, 350));
            } else {
                console.log(`Nenhum produto novo encontrado na página ${pagina}. Fim da busca.`);
                break;
            }
        } catch (error) {
            if (error.response && error.response.status === 401 && retryCount < 1) {
                await refreshBlingAccessToken();
                continue;
            }
            console.error("Erro no serviço fetchProdutos:", error.message);
            throw error;
        }
    }

    console.log(`Iniciando gravação de ${todosOsProdutos.length} produtos no banco de dados...`)

    for (const produto of todosOsProdutos) {
        const query = `
            INSERT INTO cache_produtos (id, nome, codigo, preco, estoque_saldo_virtual, situacao, imagem_url, dados_completos_json, atualizado_em)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (id) DO UPDATE SET
                nome = EXCLUDED.nome,
                codigo = EXCLUDED.codigo,
                preco = EXCLUDED.preco,
                estoque_saldo_virtual = EXCLUDED.estoque_saldo_virtual,
                situacao = EXCLUDED.situacao,
                imagem_url = EXCLUDED.imagem_url,
                dados_completos_json = EXCLUDED.dados_completos_json,
                atualizado_em = NOW()
        `;
        const estoque = produto.estoque || {};
        const values = [
            produto.id,
            produto.nome,
            produto.codigo,
            parseFloat(produto.preco) || 0,
            estoque.saldoVirtualTotal || 0,
            produto.situacao,
            produto.imagemURL,
            produto
        ];

        try {
            await db.query(query, values);
        } catch (dbError) {
            console.error(`Erro ao salvar o produto ID ${produto.id} no banco:`, dbError);
        }
    }

    console.log('Cache de produtos salvo no banco de dados com sucesso!');

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

async function fetchDetalhesPedidoVenda(idPedido, retryCount = 0) {
    if (retryCount === 0) {
        currentAccessToken = process.env.BLING_ACCESS_TOKEN;
        currentRefreshToken = process.env.BLING_REFRESH_TOKEN;
    }

    if (!currentAccessToken) {
        console.error('Erro: Access Token do Bling não disponível para fetchDetalhesPedidoVenda.');
        throw new Error('Erro de configuração: Access Token do Bling não encontrado.');
    }

    if (!currentRefreshToken && retryCount === 0) {
        console.warn('Aviso: Refresh Token do Bling não disponível para fetchDetalhesPedidoVenda. A renovação automática pode falhar.');
    }

    const url = `https://api.bling.com.br/Api/v3/pedidos/vendas/${idPedido}`;

    console.log(`Buscando detalhes de Pedido de Venda ID: ${idPedido} com Access Token: ${currentAccessToken ? 'presente' : 'AUSENTE'}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${currentAccessToken}`,
                'Accept': 'application/json',
            },
        });

        const detalhesDoPedido = response.data.data;

        if (detalhesDoPedido && typeof detalhesDoPedido === 'object' && detalhesDoPedido.id) {
        } else {
            console.warn(`Resposta da API para detalhes do pedido ${idPedido} não continha os dados esperados:`, response.data);
            throw new Error(`Pedido com ID ${idPedido} não encontrado ou resposta inesperada.`);
        }

        console.log(`Detalhes do pedido ID ${idPedido} buscados com sucesso.`);
        return detalhesDoPedido;

    } catch (error) {
        if (error.response && error.response.status === 401 && retryCount < 1) {
            console.warn(`Access Token expirado ou inválido ao buscar detalhes do pedido ID ${idPedido}. Tentando renovar...`);
            try {
                await refreshBlingAccessToken();
                console.log(`Token renovado. Re-tentando buscar detalhes do pedido ID ${idPedido} automaticamente.`);
                return fetchDetalhesPedidoVenda(idPedido, retryCount + 1);
            } catch (refreshError) {
                console.error(`Falha DEFINITIVA ao renovar o token ao buscar detalhes do pedido ID ${idPedido}:`, refreshError.message);
                throw refreshError
            }
        } else if (error.response && error.response.status === 404) {
            console.warn(`Pedido com ID ${idPedido} não encontrado no Bling (404).`);
            throw new Error(`Pedido com ID ${idPedido} não encontrado.`);
        }

        let errorMessage = `Erro ao buscar detalhes do pedido ID ${idPedido} do Bling.`;
        if (error.response) {
            const blingErrorData = error.response.data;
            console.error(`Erro detalhado da API Bling V3 (Detalhes Pedido ID ${idPedido} - Status ${error.response.status}):`, typeof blingErrorData === 'string' ? blingErrorData : JSON.stringify(blingErrorData, null, 2));
            errorMessage = `Falha na API Bling (Detalhes Pedido ID ${idPedido}): ${typeof blingErrorData === 'object' && blingErrorData !== null && (blingErrorData.error?.description || blingErrorData.error?.message) ? (blingErrorData.error.description || blingErrorData.error.message) : `Status ${error.response.status}`}`;
        } else if (error.request) {
            console.error(`Erro de rede ou sem resposta da API Bling V3 (Detalhes Pedido ID ${idPedido}):`, error.message);
            errorMessage = `Falha de conexão com a API Bling (Detalhes Pedido ID ${idPedido}).`;
        } else {
            console.error(`Erro ao configurar requisição Bling V3 (Detalhes Pedido ID ${idPedido}):`, error.message);
            errorMessage = `Erro interno ao processar requisição Bling (Detalhes Pedido ID ${idPedido}): ${error.message}`;
        }
        throw new Error(errorMessage);
    }
}

async function fetchDetalhesContato(contatoId, retryCount = 0) {
    if (retryCount === 0) {
        currentAccessToken = process.env.BLING_ACCESS_TOKEN
    }
    if (!currentAccessToken) { throw new Error('Access Token do Bling não encontrado.'); }

    const url = `https://api.bling.com.br/Api/v3/contatos/${contatoId}`;

    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${currentAccessToken}` }
        });
        return response.data.data;
    } catch (error) {
        if (error.response && error.response.status === 401 && retryCount < 1) {
            console.warn(`Token expirado ao buscar contato${contatoId}. Renovando...`);
            await refreshBlingAccessToken();
            return fetchDetalhesContato(contatoId, retryCount + 1);
        }
        console.error(`Erro ao buscar detalhes do contato ${contatoId} do Bling:`, error.message);
        throw new Error(`Falha ao buscar detalhes do contato ${contatoId}.`);
    }
}

async function atualizarPedidoNoBling(pedidoId, pedidoEditadoDoFrontend) {
    console.log(`Iniciando Atualização completa do pedido ${pedidoId} no Bling.`)

    if (!currentAccessToken) {
        await refreshBlingAccessToken();
    }

    const pedidoOriginalDoBling = await fetchDetalhesPedidoVenda(pedidoId);

    if (pedidoOriginalDoBling.contato.id === pedidoEditadoDoFrontend.contato.id &&
        pedidoOriginalDoBling.contato.nome !== pedidoEditadoDoFrontend.contato.nome) {

        const contatoId = pedidoEditadoDoFrontend.contato.id;

        try {
            const contatoOriginalCompleto = await fetchDetalhesContato(contatoId);

            const payloadContato = {
                ...contatoOriginalCompleto,
                nome: pedidoEditadoDoFrontend.contato.nome
            };

            const urlUpdateContato = `https://api.bling.com.br/Api/v3/contatos/${contatoId}`;

            await axios.put(urlUpdateContato, payloadContato, { headers: { 'Authorization': `Bearer ${currentAccessToken}` } });
            console.log(`Contato ID ${contatoId} atualizado com sucesso no Bling.`);

        } catch (error) {
            const errorData = error.response?.data;
            console.error(`Erro detalhado ao tentar ATUALIZAR o CONTATO:`, errorData);
            if (errorData?.error?.fields) {
                console.error("Campos com erro de validação:", errorData.error.fields);
            }
            throw new Error(`Falha ao atualizar o nome do contato no Bling.`);
        }
    }

    const url = `https://api.bling.com.br/Api/v3/pedidos/vendas/${pedidoId}`;

    const subtotal = pedidoEditadoDoFrontend.itens.reduce((acc, item) => acc + (item.valor * item.quantidade), 0);
    const valorDoDesconto = pedidoEditadoDoFrontend.desconto?.valor || 0;
    const totalFinal = subtotal - valorDoDesconto;

    const itensFormatados = pedidoEditadoDoFrontend.itens.map(item => {
        const itemParaBling = {
            produto: { id: item.produto.id },
            quantidade: item.quantidade,
            valor: item.valor,
            codigo: item.codigo,
            descricao: item.descricao
        };
        if (item.id > 0) {
            itemParaBling.id = item.id;
        }

        return itemParaBling;
    });

    const payloadFinal = {
        ...pedidoEditadoDoFrontend,
        itens: itensFormatados,
        total: totalFinal,
        desconto: {
            valor: valorDoDesconto,
            unidade: "REAL"
        },
        parcelas: (pedidoEditadoDoFrontend.parcelas && pedidoEditadoDoFrontend.parcelas.length > 0)
            ? [{ ...pedidoEditadoDoFrontend.parcelas[0], valor: totalFinal }]
            : []
    };

    try {
        const response = await axios.put(url, payloadFinal, {
            headers: { 'Authorization': `Bearer ${currentAccessToken}` }
        });
        console.log('Resposta do Bling ao atualizar pedido:', response.data);

        return { sucesso: true, mensagem: 'Pedido atualizado no Bling com sucesso!' };

    } catch (error) {
        const errorData = error.response?.data;
        console.error('Erro ao tentar ATUALIZAR o pedido no Bling:', JSON.stringify(errorData, null, 2) || error.message);
        const campoErro = errorData?.error?.fields?.[0];
        if (campoErro) {
            throw new Error(`Erro de validação do Bling: ${campoErro.msg} (Campo: ${campoErro.element})`);
        }
        throw new Error(`Falha ao atualizar o pedido no Bling.`);
    }
}

async function fetchTodosOsContatos(retryCount = 0) {
    console.log('Bling Service: Buscando TODOS os contatos (clientes) da conta...');

    if (retryCount === 0) { currentAccessToken = process.env.BLING_ACCESS_TOKEN; }
    if (!currentAccessToken) { throw new Error("Access Token do Bling não encontrado."); }

    const todosOsContatos = [];
    let pagina = 1;
    const limitePorPagina = 100;

    while (true) {
        const url = `https://api.bling.com.br/Api/v3/contatos?pagina=${pagina}&limite=${limitePorPagina}`;
    
        try {
            console.log(`Buscando contatos - Página: ${pagina}`);
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${currentAccessToken}` },
            });

            const contatosDaPagina = response.data.data;

            if (contatosDaPagina && contatosDaPagina.length > 0) {
                const clientesTransformados = contatosDaPagina.map(contato => ({
                    id: contato.id,
                    nome: contato.nome,
                    numeroDocumento: contato.numeroDocumento,
                    tipoPessoa: contato.tipoPessoa,
                    email: contato.email,
                    vendedor: contato.vendedor
                }));
                todosOsContatos.push(...clientesTransformados);
            }

            if (!contatosDaPagina || contatosDaPagina.length < limitePorPagina) {
                console.log('Última página de contatos alcançada.');
                break;
            }

            pagina++;
            await new Promise(resolve => setTimeout(resolve, 350));

        } catch (erro) {
            if (erro.response && erro.response.status === 401 && retryCount < 1) {
                console.warn('Token expirado ao buscar contatos, Renovando...');
                await refreshBlingAccessToken();
                continue;
            }
            console.error(`Erro ao buscar contatos na página ${pagina}:`, erro.response?.data || erro.message);
            throw new Error("Falha ao buscar contatos no ERP.");
        }
    }
    console.log(`Busca de contatos finalizada. Total de ${todosOsContatos.length} contatos.`);
    return todosOsContatos;
}


async function criarClienteBling(dadosCliente) {
    console.log('Enviando dados para criar novo cliente no Bling:', dadosCliente);
    const accessToken = process.env.BLING_ACCESS_TOKEN;
    const url = 'https://api.bling.com.br/Api/v3/contatos';

    try {
        const response = await axios.post(url, dadosCliente, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        console.log('Cliente criado no Bling com sucesso!');
        return response.data;
    } catch (error) {
        console.error('Erro ao criar cliente no Bling:', JSON.stringify(error.response?.data, null, 2) || error.message);
        throw new Error(error.response?.data?.error?.description || 'Falha ao criar cliente no Bling.');
    }
}

module.exports = { fetchTodosOsContatos, refreshBlingAccessToken, fetchPedidosVendas, fetchProdutos, criarPedidoVenda, fetchFormasPagamento, fetchDetalhesPedidoVenda, atualizarPedidoNoBling, fetchDetalhesContato, criarClienteBling, };