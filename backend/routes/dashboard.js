const express = require("express");
const router = express.Router();
const { fetchPedidosVendas } = require("../services/bling");
const { autenticarToken } = require("../middlewares/authMiddleware");

router.use(autenticarToken);

router.get("/metricas", async (req, res) => {
    console.log("Rota /metricas: Calculando todos os dados do painel...");
    try {
        const idVendedor = req.usuario.id_vendedor_bling;

        if (!idVendedor) {
            return res.status(403).json({ error: "Usuário não tem um ID de vendedor associado." });
        }

        const todosOsPedidos = await fetchPedidosVendas(idVendedor);
        console.log(`Rota /metricas: Total de ${todosOsPedidos.length} pedidos recebidos do Bling.`);

        if (todosOsPedidos.length > 0) {
            console.log("=== DEBUG: Estrutura dos pedidos ===");
            console.log("Primeito pedido completo:", JSON.stringify(todosOsPedidos[0], null, 2));

            const situacoesUnicas = [...new Set(todosOsPedidos.map(p => p.situacao?.id).filter(id => id))];
            console.log('IDs de situações encontradas:', situacoesUnicas);

            const estruturasValor = todosOsPedidos.slice(0, 3).map(p => ({
                id: p.id,
                valor: p.valor,
                total: p.total,
                valorTotal: p.valorTotal
            }));
            console.log('Estruturas de valor (primeiros 3 pedidos):', estruturasValor);
        }

        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        const statusVendaConcluida = [9];
        const idStatusEmAberto = 6;

        let vendasMes = 0;
        let vendasAno = 0;
        let pedidosAbertos = 0;

        console.log('=== Processando pedidos para cálculo de vendas ===');

        for (const pedido of todosOsPedidos) {
            let dataPedido;
            try {
                dataPedido = new Date(pedido.data || pedido.dataVenda || pedido.dataPedido);
            } catch (error) {
                console.warn(`Erro ao parsear data do pedido ${pedido.id}:`, error);
                continue;
            }

            if (isNaN(dataPedido.getTime())) {
                console.warn(`Data inválida no pedido ${pedido.id}:`, pedido.data);
                continue;
            }

            const situacaoId = pedido.situacao?.id;

            if (situacaoId === idStatusEmAberto) {
                pedidosAbertos++;
            }

            if (statusVendaConcluida.includes(situacaoId)) {
                let valorTotalPedido = 0;

                if (pedido.valor?.total) {
                    valorTotalPedido = parseFloat(pedido.valor.total);
                } else if (pedido.total) {
                    valorTotalPedido = parseFloat(pedido.total);
                } else if (pedido.valorTotal) {
                    valorTotalPedido = parseFloat(pedido.valorTotal);
                } else if (pedido.valor) {
                    valorTotalPedido = parseFloat(pedido.valor);
                }

                if (valorTotalPedido > 0) {
                    console.log(`Pedido ${pedido.id} - Status: ${situacaoId}, Valor: R$ ${valorTotalPedido}, Data: ${dataPedido.toLocaleDateString()}`);
                }

                if (dataPedido.getFullYear() === anoAtual) {
                    vedasAno += valorTotalPedido;
                }

                if (dataPedido.getFullYear() === anoAtual && dataPedido.getMonth() === mesAtual) {
                    vendasMes += valorTotalPedido;
                }
            }
        }

        const metaMes = 150000;

        res.json({
            vendasMes: Math.round(vendasMes * 100) / 100,
            vendasAno: Math.round(vendasAno * 100) / 100,
            pedidosAbertos,
            metaMes,
        });

    } catch (error) {
        console.error("Erro na rota /metricas:", error.message);
        res.status(500).json({ error: "Erro ao buscar métricas do painel." });
    }
});

module.exports = router;