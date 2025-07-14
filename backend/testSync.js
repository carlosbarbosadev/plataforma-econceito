require('dotenv').config();
const { sincronizarDadosDoBling } = require('./services/blingSyncService');

async function runTest() {
    console.log('Disparando teste de sincronização manual...');
    await sincronizarDadosDoBling();
    console.log('Teste finalizado. Verifique os logs e o banco de dados')
    process.exit(0);
}

runTest();