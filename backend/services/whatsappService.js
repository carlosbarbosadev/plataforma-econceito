require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_ACCOUNT_TOKEN;
const client = twilio(accountSid, authToken);
const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_FROM;

/**
 * Envia uma mensagem de WhatsApp com um arquivo de mídia
* @param {string} toNumber - O número do destinatário
* @param {string} mediaUrl - A URL pública do arquivo
* @param {string} caption - O texto que acompanha o arquivo
*/
async function sendWhatsAppMedia(toNumber, mediaUrl, caption) {
    if (!accountSid || !authToken) {
        throw new Error('Serviço de WhatsApp não configurado.');
    }
    try {
        console.log(`Enviando WhatsApp com mídia de ${fromWhatsAppNumber} para ${toNumber}...`);
        const message = await client.messages.create({
            from: fromWhatsAppNumber,
            to: toNumber,
            body: caption,
            mediaUrl: [mediaUrl],
        });
        console.log('Mensagem com mídia enviada com sucesso. SID:', message.sid);
        return message;
    } catch (error) {
        console.error('Erro ao enviar mídia pelo WhatsApp:', error.message);
        throw new Error('Falha ao enviar mídia via Twilio.');
    }
}

module.exports = { sendWhatsAppMedia };