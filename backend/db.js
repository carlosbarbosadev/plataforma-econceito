require('dotenv').config();             // Carrega variáveis de .env 
const { Pool } = require('pg');         // Importa o pool do pg

// Configura a conexão usando as variáveis de ambiente

const pool = new pool ({
    host:     process.env.DB_HOST,      // ex: localhost
    port:     process.env.DB_PORT,      // ex: 5432
    user:     process.env.DB_USER,      // seu usuário do Postgres
    password: process.env.DB_PASS,      // sua senha do Postgres
    database: process.env.DB_NAME,      // nome do banco
});

module.exports = pool;                  // Exporta o pool para usar nas rotas