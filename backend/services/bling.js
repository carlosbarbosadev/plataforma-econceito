require('dotenv').config();
const axios = require('axios');

const BASE = 'https://bling.com.br/Api/v2';

async function fetchClientes() {
    const url = `${BASE}/clientes/?apikey=${process.env.BLING_API_KEY}&json=true`;
    const resp = await axios.get(url);
    // O Bling retorna um objeto aninhado; aqui simplificamos:
    const pedidos = resp.data.retorno.clientes ?? [];
    // Cada item vem dentro de { cliente {...} } 
    return pedidos.map(p => p.cliente);
}

module.exports = { fetchClientes };
