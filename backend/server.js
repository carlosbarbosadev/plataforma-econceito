require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json()); // 🔥 Sem isso, o req.body vem vazio!

const produtosRoute = require('./routes/produtos');
app.use('/produtos', produtosRoute);

const loginRoute = require('./routes/login');
app.use('/login', loginRoute); // 🔐 Garante que a rota funcione

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

const clientesRoute = require('./routes/clientes');
app.use('/clientes', clientesRoute);

const pedidosRoute = require('./routes/pedidos');
app.use('/pedidos', pedidosRoute);