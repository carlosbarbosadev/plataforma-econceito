require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const produtosRoute = require('./routes/produtos');
const loginRoute    = require('./routes/login');
const clientesRoute = require('./routes/clientes');
const pedidosRoute  = require('./routes/pedidos');

app.use('/api/produtos',  produtosRoute);
app.use('/api/login',     loginRoute);
app.use('/api/clientes',  clientesRoute);
app.use('/api/pedidos',   pedidosRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});