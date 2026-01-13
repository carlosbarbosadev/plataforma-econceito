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
const campanhasRoutes = require('./routes/campanhas');
const shipmentRoutes = require('./routes/shipment')
const crmRoutes = require('./routes/crm');
const apicache = require('apicache');
const cache = apicache.middleware;

const whiteList = [
    'http://localhost:3039',
    'https://d2euv2imqscvrl.cloudfront.net',
    'https://app.gostratto.com.br'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (whiteList.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Acesso negado pelo CORS'));
        }
    },
    credentials: true 
};

app.use(cors(corsOptions));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/campanhas', campanhasRoutes);
app.use('/api/expedicao', shipmentRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/utils', cache('1 hour', (req, res) => res.statusCode === 200), utilRoutes);

const cron = require('node-cron');
const { iniciarSincronizacaoGeral, iniciarSincronizacaoAgendada } = require('./services/blingSyncService');

app.get('/api/sync/manual-trigger/:secret', (req, res) => {
    const { secret } = req.params;

    const nossoSegredo = process.env.MANUAL_SYNC_SECRET || 'SEGREDO_PADRAO_MUITO_FORTE_2854';

    if (secret !== nossoSegredo) {
        return res.status(403).json({ message: 'Acesso negado. Segredo inválido.' });
    }

    res.status(200).json({ message: 'Comando de sincronização recebido. O processo foi iniciado em segundo plano. Verifique os logs para acompanhar.' });

    iniciarSincronizacaoGeral().catch(err => {
        console.error('Erro crítico na sincronização manual disparada via API:', err);
    });
});

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
