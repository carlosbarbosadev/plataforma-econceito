require('dotenv').config();       // carrega as variáveis do .env
const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./db');
const authRoutes = require('./routes/auth');

// --- middlewares globais ---
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

// --- rotas da sua API ---
const loginRoute          = require('./routes/login');
const produtosRoute       = require('./routes/produtos');
const clientesRoute       = require('./routes/clientes');
const pedidosRoute        = require('./routes/pedidos');

app.use('/api/login',     loginRoute);
app.use('/api/produtos',  produtosRoute);
app.use('/api/clientes',  clientesRoute);
app.use('/api/pedidos',   pedidosRoute);

// --- parte crucial: só depois de todas as rotas é que falamos ao Express para ouvir a porta ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
