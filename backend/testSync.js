require('dotenv').config();
const { iniciarSincronizacaoGeral } = require('./services/blingSyncService');

async function runTest() {
    console.log('Disparando teste de sincronização manual...');
    await iniciarSincronizacaoGeral();
    console.log('Teste finalizado. Verifique os logs e o banco de dados');
    process.exit(0);
}

runTest();