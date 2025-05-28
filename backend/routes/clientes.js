const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
// Agora vamos usar fetchPedidosVendas para obter os dados base para os clientes de um vendedor
const { fetchPedidosVendas } = require('../services/bling'); 
// fetchClientes (que busca em /contatos) ainda pode ser útil para uma visão geral de admin de todos os contatos
const { fetchClientes: fetchTodosOsContatos } = require('../services/bling'); // Renomeado para clareza

router.get('/', autenticarToken, async (req, res) => {
  console.log(`Rota /api/clientes acessada por: ${req.usuario.email} (Tipo: ${req.usuario.tipo})`);

  try {
    let clientesFinaisParaRetornar = [];

    if (req.usuario.tipo === 'admin') {
      // Para o admin, podemos continuar buscando todos os contatos e filtrando por PJ,
      // ou decidir se a visão de "clientes" do admin também deve ser baseada em quem já teve pedidos.
      // Por simplicidade e para manter o que o admin via antes (todos os contatos), vamos usar fetchTodosOsContatos.
      // E depois filtrar por PJ.
      console.log('Usuário é ADMIN. Buscando todos os contatos e filtrando por PJ...');
      const todosOsContatosDoBling = await fetchTodosOsContatos(); // Usa a função que busca em /contatos
      
      clientesFinaisParaRetornar = todosOsContatosDoBling.filter(contato => {
        // Precisamos verificar se o campo tipoPessoa existe na resposta de /contatos
        // ou usar o filtro por numeroDocumento. Vamos assumir que não temos tipoPessoa aqui por enquanto
        // e usar o filtro de numeroDocumento para admin.
        // Se o objeto contato da lista /contatos TAMBÉM tiver tipoPessoa, melhor ainda.
        // Pelo seu último log do console.dir de /contatos, tipoPessoa NÃO estava lá.
        if (contato.numeroDocumento && typeof contato.numeroDocumento === 'string') {
            const apenasDigitos = contato.numeroDocumento.replace(/\D/g, '');
            return apenasDigitos.length === 14; // CNPJ
        }
        return false;
      });
      console.log(`Admin: Encontrados ${clientesFinaisParaRetornar.length} contatos PJ de um total de ${todosOsContatosDoBling.length}.`);

    } else if (req.usuario.tipo === 'vendedor') {
      const idVendedorBlingDoUsuario = req.usuario.id_vendedor_bling;

      if (!idVendedorBlingDoUsuario) {
        console.warn(`Vendedor ${req.usuario.email} não possui 'id_vendedor_bling' definido. Retornando lista vazia.`);
        return res.json([]);
      }
      
      console.log(`Vendedor ${req.usuario.email}: Buscando pedidos para o ID Bling ${idVendedorBlingDoUsuario} para extrair clientes PJ...`);
      const pedidosDoVendedor = await fetchPedidosVendas(idVendedorBlingDoUsuario);

      const mapaClientes = new Map();
      pedidosDoVendedor.forEach(pedido => {
        if (pedido.contato && pedido.contato.id && pedido.contato.tipoPessoa === 'J') {
          // Adiciona ao mapa apenas se não existir, para garantir clientes únicos
          if (!mapaClientes.has(pedido.contato.id)) {
            mapaClientes.set(pedido.contato.id, {
              id: pedido.contato.id,
              nome: pedido.contato.nome,
              numeroDocumento: pedido.contato.numeroDocumento,
              tipoPessoa: pedido.contato.tipoPessoa,
              // Adicione outros campos do contato que vêm no pedido e que você queira usar
              // telefone: pedido.contato.telefone, // Se vier no objeto contato do pedido
              // celular: pedido.contato.celular,  // Se vier no objeto contato do pedido
            });
          }
        }
      });
      clientesFinaisParaRetornar = Array.from(mapaClientes.values());
      console.log(`Vendedor ${req.usuario.email}: Encontrados ${clientesFinaisParaRetornar.length} clientes PJ únicos a partir de ${pedidosDoVendedor.length} pedidos.`);
    
    } else {
      console.warn(`Tipo de usuário '${req.usuario.tipo}' não reconhecido. Retornando 403.`);
      return res.status(403).json({ mensagem: 'Permissão negada.' });
    }

    return res.json(clientesFinaisParaRetornar);
    
  } catch (err) {
    console.error('Falha crítica na rota /api/clientes:', err.message);
    if (!res.headersSent) {
        res.status(500).json({ mensagem: `Falha ao processar requisição de clientes: ${err.message}` });
    }
  }
});

module.exports = router;