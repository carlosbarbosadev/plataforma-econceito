require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const db = require('./db');


const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const produtosRoutes = require('./routes/produtos');
const pedidosRoutes = require('./routes/pedidos');
const utilRoutes = require('./routes/utils');
const dashboardRoutes = require("./routes/dashboard");
const webhooksRoutes = require('./routes/webhooks');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/utils', utilRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhooksRoutes);

const cron = require('node-cron');
const { iniciarSincronizacaoGeral, iniciarSincronizacaoAgendada } = require('./services/blingSyncService');

cron.schedule('0 0,12 * * *', () => {
    console.log('AGENDADOR: Disparando rotina de sincronização automática...');
    iniciarSincronizacaoGeral();
}, {
    timezone: "America/Sao_Paulo"
});

console.log('Agendamento da sincronização ativado. A rotina rodará diariamente às 00:00 e 12:00 (horário de São Paulo).');

// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  iniciarSincronizacaoAgendada();
});
