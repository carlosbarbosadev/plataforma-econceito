const express = require('express');
const router = express.Router();
const { autenticarToken } = require('../middlewares/authMiddleware');
const { fetchClientes } = require('../services/bling'); 

router.get('/', autenticarToken, async (req, res) => {
  console.log(`Rota /api/clientes acessada por: ${req.usuario.email} (Tipo: ${req.usuario.tipo})`);

  try {
    let clientes;

    if (req.usuario.tipo === "admin") {
      clientes = await fetchClientes({ tipoPessoa: "J" });

    } else if (req.usuario.tipo === "vendedor") {
      const idVendedorBling = req.usuario.id_vendedor_bling;
      if (!idVendedorBling) {
        console.warn(`Vendedor ${req.usuario.email} não possui "id_vendedor_bling".`);
        return res.json([]);
      }
      clientes = await fetchClientes({ idVendedor: idVendedorBling });

    } else {
      return res.status(403).json({ mensagem: "Permissão negada." });
    }
    console.log(`Retornando ${clientes.length} clientes para o usuário ${req.usuario.email}.`);
    res.json(clientes);

  } catch (err) {
    console.error("Falha crítica na rota /api/clientes:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ mensagem: `Falha ao procesar requisição de clientes: ${err.message}` });
    }
  }
});

module.exports = router;