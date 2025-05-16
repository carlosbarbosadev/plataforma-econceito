const express = require('express');
const router = express.Router();
const querystring = require('querystring');

const clientId = process.env.BLING_CLIENT_ID;
const redirectUri = process.env.BLING_REDIRECT_URI;

router.get('/', (req, res) => {
  const params = querystring.stringify({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'produtos clientes pedidos vendas',
    state: 'seguro123',
  });

  const url = `https://www.bling.com.br/Api/v3/oauth/authorize?${params}`;
  res.redirect(url);
});

module.exports = router;
