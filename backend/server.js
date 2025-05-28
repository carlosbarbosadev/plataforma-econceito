require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();


const db = require('./db');


const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const produtosRoutes = require('./routes/produtos');
const pedidosRoutes = require ('./routes/pedidos');


app.use(cors());
app.use(express.json());


app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/pedidos', pedidosRoutes);

// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
