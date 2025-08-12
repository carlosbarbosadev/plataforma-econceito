const PDFDocument = require('pdfkit');

function generateOrderPdf(pedidoData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({size: 'A4', margin: 50});
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Header
            doc.fontSize(20).font('Helvetica-Bold').text(`Pedido de venda #${pedidoData.numero}`, {align: 'center' }).moveDown();

            // Customer Information
            doc.fontSize(12).font('Helvetica-Bold').text('Dados do Cliente', { underline: true }).moveDown(0.5);
            doc.font('Helvetica').text(`Nome: ${pedidoData.contato.nome}`);
            if (pedidoData.contato.email) doc.text(`Email: ${pedidoData.contato.email}`);
            doc.moveDown();

            // Itens Table
            doc.fontSize(14).font('Helvetica-Bold').text('Itens do Pedido', { underline: true }).moveDown();
            const tableTop = doc.y;
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Descrição', 50, tableTop);
            doc.text('Qtd.', 350, tableTop);
            doc.text('Vl. Un.', 420, tableTop, { align: 'right' });
            doc.text('Total', 500, tableTop, { align: 'right' });
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);

            doc.font('Helvetica');
            pedidoData.itens.forEach(item => {
                const y = doc.y;
                doc.text(item.descricao, 50, y, { width: 280 });
                doc.text(item.quantidade.toFixed(2), 350, y);
                doc.text(item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 380, y, { width: 100, align: 'right' });
                doc.text((item.quantidade * item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 460, y, { width: 100, align: 'right' });
                doc.moveDown(1.5);
            });
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

            // Final total
            doc.fontSize(12).font('Helvetica-Bold');
            doc.text(`Total do Pedido:`, 350, doc.y, { align: 'right' });
            doc.text(`${pedidoData.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 460, doc.y - 15, { width: 100, align: 'right' });

            doc.end()
        } catch(error) {
            reject(error);
        }
    });
}

module.exports = { generateOrderPdf };