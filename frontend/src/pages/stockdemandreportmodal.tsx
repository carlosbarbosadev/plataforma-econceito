import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useState, useEffect } from 'react';
import { Modal, Button, Table, Spinner, Alert, Form } from 'react-bootstrap';

import api from 'src/services/api';

interface StockReportItem {
  product_code: string;
  description: string;
  total_demand: number;
  current_stock: number;
  needed_quantity: number;
}

interface StockDemandReportModalProps {
  show: boolean;
  onHide: () => void;
}

export function StockDemandReportModal({ show, onHide }: StockDemandReportModalProps) {
  const [reportData, setReportData] = useState<StockReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroPascoa, setFiltroPascoa] = useState(false);

  useEffect(() => {
    if (show) {
      const fetchStockReport = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await api.get('/api/expedicao/stock-demand-report', {
            params: { pascoa: filtroPascoa }
          });
          setReportData(response.data);
        } catch (err) {
          setError('Não foi possível carregar o relatório de estoque.');
          console.error('Erro ao buscar relatório de estoque:', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchStockReport();
    }
  }, [show, filtroPascoa]);

  const handleDownloadPdf = () => {
    if (reportData.length === 0) return;

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;

    const totalGeralFaltantes = reportData.reduce((acc, item) => acc + item.needed_quantity, 0);

    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Estoque', 14, 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(dataFormatada, 196, 22, { align: 'right' });
    doc.setFontSize(10);

    autoTable(doc, {
      startY: 30,
      head: [['Descrição', 'Código', 'Demanda', 'Estoque', 'Faltam']],
      body: reportData.map((item) => [
        item.description,
        item.product_code,
        item.total_demand,
        item.current_stock,
        item.needed_quantity,
      ]),
      styles: {
        fontSize: 9.9,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [250, 250, 250],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [215, 215, 215],
      },
      didParseCell: function (data) {
        if (data.column.index === 4 && typeof data.cell.raw === 'number' && data.cell.raw > 0) {
          data.cell.styles.textColor = [220, 53, 69]; // Vermelho
          data.cell.styles.fontStyle = 'bold';
        }
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // Descrição (ocupa o resto)
        1: { cellWidth: 22 }, // Código
        2: { cellWidth: 20 }, // Demanda
        3: { cellWidth: 20 }, // Estoque
        4: { cellWidth: 15 }, // Faltam
      },
    });

    doc.save(`Relatório_Estoque`);
  };

  const renderContent = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (reportData.length === 0)
      return <p>Nenhum item demandado pelos pedidos da expedição no momento.</p>;

    return (
      <>
        <div className="botao-margin d-flex justify-content-between align-items-center">
          <Button
            style={{ borderRadius: '3px' }}
            className="relatorio-button"
            onClick={handleDownloadPdf}
          >
            Baixar PDF
          </Button>
          <Form.Check
            type="switch"
            id="filtro-pascoa"
            label="Filtrar produtos de Páscoa"
            checked={filtroPascoa}
            onChange={(e) => setFiltroPascoa(e.target.checked)}
          />
        </div>

        <Table bordered hover className="fix-table">
          <thead>
            <tr>
              <th style={{ width: '60%' }}>Descrição</th>
              <th style={{ width: '10%' }}>Código</th>
              <th style={{ width: '10%' }}>Demanda</th>
              <th style={{ width: '10%' }}>Estoque</th>
              <th className="text-danger" style={{ width: '10%' }}>
                Faltam
              </th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item) => {
              const needsHighlight = item.needed_quantity > 0;

              return (
                <tr
                  key={item.product_code}
                  className="stock-table"
                  style={{ backgroundColor: needsHighlight ? '#FFEBEE' : 'transparent' }}
                >
                  <td>{item.description}</td>
                  <td>{item.product_code}</td>
                  <td className="text-end">{item.total_demand}</td>
                  <td className="text-end">{item.current_stock}</td>
                  <td className={`text-end fw-bold ${needsHighlight ? 'text-danger' : ''}`}>
                    {item.needed_quantity}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </>
    );
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered dialogClassName="meu-modal-custom">
      {' '}
      <Modal.Header closeButton>
        <Modal.Title>Relatório de Estoque</Modal.Title>
      </Modal.Header>
      <Modal.Body>{renderContent()}</Modal.Body>
    </Modal>
  );
}
