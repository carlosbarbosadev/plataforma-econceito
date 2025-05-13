const express = require('express');
const axios = require('axios');
const router = express.Router();
const querystring = require('querystring');

const clientId = process.env.BLING_CLIENT_ID;
const clientSecret = process.env.BLING_CLIENT_SECRET;
const redirectUri = process.env.BLING_REDIRECT_URI;

router.get('/', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Código de autorização não recebido');
  }

  const tokenUrl = 'https://www.bling.com.br/Api/v3/oauth/token';
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post(
      tokenUrl,
      querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`
        },
      }
    );

    const { access_token, refresh_token } = response.data;

    console.log('✅ TOKEN DE ACESSO:', access_token);
    console.log('🔁 REFRESH TOKEN:', refresh_token);

    res.send(`✅ Token gerado com sucesso:<br><br><strong>Access Token:</strong> ${access_token}<br><br><strong>Refresh Token:</strong> ${refresh_token}`);
  } catch (err) {
    console.error('❌ ERRO AO GERAR TOKEN:', err.response?.data || err.message, err.stack);
    res.status(500).send('Erro ao gerar token');
  }
});

module.exports = router;
