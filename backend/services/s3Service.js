require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

/**
 * Faz o upload de um buffer de PDF para o bucket S3.
 * @param {Buffer} pdfBuffer - O conteúdo do PDF gerado
 * @param {string} fileName - O nome do arquivo a ser salvo no S3
 * @return {Promise<string>} A URL pública  do arquivo no S3
 */
async function uploadPdfToS3(pdfBuffer, fileName) {
    const bucketName = process.env.S3_BUCKET_NAME;

    const params = {
        Bucket: bucketName,
        Key: `pedidos-whatsapp/${fileName}`,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
    };

    try {
        console.log(`Fazendo upload de ${fileName} para o S3...`);
        const data = await s3.upload(params).promise();
        console.log('Upload para o S3 concluído com sucesso. URL:', data.Location);
        return data.Location;
    } catch (error) {
        console.error('Erro ao fazer upload para o S3:', error);
        throw new Error('Falha ao guardar o PDF no armazenamento em nuvem.');
    }
}

module.exports = { uploadPdfToS3 };