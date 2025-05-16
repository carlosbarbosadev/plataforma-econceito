const tokens = require('../bling-tokens.json');
const accessToken = tokens.access_token;

const fs = require('fs');
const path = require('path');

// ...

// Salvar tokens no arquivo
fs.writeFileSync(
  path.join(__dirname, '../bling-tokens.json'),
  JSON.stringify({ access_token, refresh_token: newRefreshToken }, null, 2)
);

module.exports = router;
