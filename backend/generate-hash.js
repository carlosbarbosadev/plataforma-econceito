const bcrypt = require('bcryptjs');

const senhaParaHash = 'Diogosilva2024';
const saltRounds = 10;

bcrypt.hash(senhaParaHash, saltRounds, function(err, hash) {
    if (err) {
        console.error('Erro ao gerar hash', err);
        return;
    }
    console.log('Senha original:', senhaParaHash);
    console.log('Senha Hasheada (para o Vendedor Teste:', hash);
});