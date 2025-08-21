import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

export const generateOrderPdf = (pedidoData) => {
    try {
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });

        // -- INFORMAÇÕES DA EMPRESA -- 
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 40;
        const x = pageWidth - margin;
        let y = 50;

        doc.text('CONCEITO FESTAS LTDA - (45) 3053-1122', x, y, { align: 'right' });
        y += 12;
        doc.text('Rua Barão do Rio Branco, N° 4876', x, y, { align: 'right' });
        y += 12;
        doc.text('85905040 - Toledo, PR', x, y, { align: 'right' });
        y += 12;
        doc.text('CNPJ: 44.190.482/0001-65, IE: 9091686438', x, y, { align: 'right' });

        // -- HEADER -- 
        doc.setFontSize(20).setFont('helvetica', 'bold');
        doc.text(`Pedido ${pedidoData.numero}`, doc.internal.pageSize.getWidth() / 2, 120, { align: 'center' });

        // -- DADOS DO CLIENTE --
        const clienteY = 160;

        doc.setFontSize(9).setFont('helvetica', 'bold');
        doc.text('Dados do Cliente', 40, clienteY - 5);

        doc.rect(40, clienteY, doc.internal.pageSize.getWidth() - 300, 38);

        doc.setFontSize(9).setFont('helvetica', 'normal');

        let yAtual = clienteY + 15;

        doc.text(`${pedidoData.contato.nome}`, 45, yAtual);
        yAtual += 15;

        if (pedidoData.contato.numeroDocumento) {
            doc.text(`${pedidoData.contato.numeroDocumento}`, 45, yAtual);
            yAtual += 15;
        }

        // -- VENDEDOR --
        const vendedorY = 230;

        doc.setFontSize(9).setFont('helvetica', 'bold');
        doc.text('Vendedor', 40, vendedorY - 5);

        doc.rect(40, vendedorY, doc.internal.pageSize.getWidth() - 300, 25);

        doc.setFontSize(9).setFont('helvetica', 'normal');

        const nomeVendedor = pedidoData.vendedor_nome || 'Não informado';
        doc.text(nomeVendedor, 45, vendedorY + 15);

        // -- Tabela de itens --
        const tableColumn = ["Descrição", "Quantidade", "Valor Unitário", "Valor Total"];
        const tableRows = [];
        const itens = pedidoData.itens || [];

        itens.forEach(item => {
            const itemData = [
                item.descricao,
                Number(item.quantidade).toFixed(2),
                Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                (item.quantidade * item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ];
            tableRows.push(itemData);
        });

        const tabelaY = 295;

        doc.setFontSize(9).setFont('helvetica', 'bold');
        doc.text('Itens do Pedido', 40, tabelaY - 8);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: tabelaY,
            theme: 'striped',
            headStyles: {
                fillColor: [84, 84, 84],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            styles: {
                font: 'helvetica',
                fontSize: 9,
                cellPadding: 6
            },
            margin: { left: 40, right: 40 },
        });

        // -- TOTAIS --
        const finalY = doc.lastAutoTable.finalY;
        const rightAlignX = pageWidth - margin;
        
        const numeroDeItens = itens.length;
        const somaDasQuantidades = itens.reduce((total, item) => total + Number(item.quantidade), 0);

        doc.setFontSize(9).setFont('helvetica', 'bold');

        doc.text('Nº de Itens:', rightAlignX - 80, finalY + 60, { align: 'right'});
        doc.text(numeroDeItens.toString(), rightAlignX - 10, finalY + 60, {align: 'right' });

        doc.text('Soma das Quantidades:', rightAlignX - 80, finalY + 75, { align: 'right' });
        doc.text(somaDasQuantidades.toFixed(2), rightAlignX - 10, finalY + 75, { align: 'right' });

        doc.text('Total do pedido:', rightAlignX - 80, finalY + 90, { align: 'right' });
        doc.text(Number(pedidoData.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), rightAlignX - 8, finalY + 90, { align: 'right' });

        // -- Inicia o download --
        doc.save(`Pedido-${pedidoData.numero}.pdf`);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Houve um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    }
};