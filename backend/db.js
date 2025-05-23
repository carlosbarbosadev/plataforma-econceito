const { Pool } = require('pg');

const pool = new Pool ({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.log('Erro ao conectar ou testar o banco de dados PostgreSQL:', err.stack);
    } else {
        console.log('Conectado ao banco de dados PostgreSQL com sucesso');
        console.log('Horário atual do banco:', res.rows[0].now);
    }  
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
