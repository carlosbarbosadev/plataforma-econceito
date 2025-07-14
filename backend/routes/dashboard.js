const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');

router.use(autenticarToken);

router.get('/all', async (req, res) => {
    console.log('Rota /all: Buscando dados do painel a partir do CACHE LOCAL...');
    try {
        const idVendedor = req.usuario.id_vendedor_bling;

        if (!idVendedor) {
            return res.status(403).json({ error: 'Usuário não tem um ID de vendedor associado.'});
        }

        const queryMetricas = 'SELECT * FROM vw_dashboard_dados WHERE vendedor_id = $1';
        const { rows: [metricasDoCache] } = await db.query(queryMetricas, [idVendedor]);

        const metricas = metricasDoCache || {
            vendas_mes: 0,
            vendas_ano: 0,
            pedidos_abertos: 0,
        };

        const queryTopProdutos = `
            SELECT produto_nome AS label, total_vendido AS value
            FROM cache_produtos_mais_vendidos
            WHERE vendedor_id = $1
            ORDER BY total_vendido DESC
            LIMIT 5;
        `;
        const { rows: top5Produtos } = await db.query(queryTopProdutos, [idVendedor]);

        const anoAtual = new Date().getFullYear();
        const anoAnterior = anoAtual - 1;

        const queryComparativo = `
            SELECT
                EXTRACT(MONTH FROM data_pedido) AS mes,
                SUM(CASE WHEN EXTRACT(YEAR FROM data_pedido) = $1 THEN total ELSE 0 END) AS total_ano_atual,
                SUM(CASE WHEN EXTRACT(YEAR FROM data_pedido) = $2 THEN total ELSE 0 END) AS total_ano_anterior
            FROM cache_pedidos
            WHERE status_id = 9 AND vendedor_id = $3 AND EXTRACT(YEAR FROM data_pedido) IN ($1, $2)
            GROUP BY EXTRACT(MONTH FROM data_pedido);
        `;
        const { rows: dadosComparativo } = await db.query(queryComparativo, [anoAtual, anoAnterior, idVendedor]);

        const vendasAnoAtual = Array(12).fill(0);
        const vendasAnoAnterior = Array(12).fill(0);
        for (const row of dadosComparativo) {
            vendasAnoAtual[row.mes - 1] = parseFloat(row.total_ano_atual) || 0;
            vendasAnoAnterior[row.mes - 1] = parseFloat(row.total_ano_anterior);
        }

        console.log('Dados do painel extraídos do cache com sucesso!');

        res.json({
            metricas: {
                vendasMes: Math.round(metricas.vendas_mes * 100) / 100,
                vendasAno: Math.round(metricas.vendas_ano * 100) / 100,
                pedidosAbertos: parseInt(metricas.pedidos_abertos, 10),
                metaMes: 30000,
            },
            comparativoAnual: {
                chart: {
                    categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                    series: [
                        { name: `${anoAtual}`, data: vendasAnoAtual },
                        { name: `${anoAnterior}`, data: vendasAnoAnterior },
                    ],
                }
            },
            produtosMaisVendidos: {
                chart: {
                    series : top5Produtos,
                },
            }
        });
    } catch (error) {
        console.error("Erro na rota /all (versão cache):", error.message, error.stack);
        res.status(500).json({ error: 'Erro ao buscar dados do painel a partir do cache' });
    }
});

module.exports = router;