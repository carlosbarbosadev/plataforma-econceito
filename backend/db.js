const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
    host: isProduction ? process.env.PROD_DB_HOST : process.env.DB_HOST,
    user: isProduction ? process.env.PROD_DB_USER : process.env.DB_USER,
    password: isProduction ? process.env.PROD_DB_PASSWORD : process.env.DB_PASS,
    database: isProduction ? process.env.PROD_DB_DATABASE : process.env.DB_NAME,
    port: isProduction ? parseInt(process.env.PROD_DB_PORT, 10) : parseInt(process.env.DB_PORT || '5432', 10),
    ssl: isProduction ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(connectionConfig);

pool.query('SELECT NOW()', (err, res) => {
    const environment = isProduction ? 'PRODUÇÃO (AWS)' : 'LOCAL';
    if (err) {
        console.log(`Erro ao conectar ao banco de dados de ${environment}:`, err.stack);
    } else {
        console.log(`Conectado ao banco de dados de ${environment} com sucesso.`);
        console.log('Horário atual do banco:', res.rows[0].now);
    }  
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
