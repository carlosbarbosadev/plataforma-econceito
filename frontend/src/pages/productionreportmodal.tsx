import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useState, useEffect } from 'react';
import { Modal, Button, Table, Spinner, Alert } from 'react-bootstrap';

import api from 'src/services/api';

interface ReportItem {
  product_code: string;
  descricao: string;
  total_quantity: string;
}

interface ProductionReportModalProps {
  show: boolean;
  onHide: () => void;
}

export function ProductionReportModal({ show, onHide }: ProductionReportModalProps) {
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      const fetchReport = async () => {
        setIsLoading(true);
        setError(null);
        setReportData([]);
        try {
          const response = await api.get('/api/expedicao/production-report');
          setReportData(response.data);
        } catch (err) {
          setError('Não foi possível carregar o relatório.');
          console.error('Erro ao buscar relatório:', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchReport();
    }
  }, [show]);

  const handleDownloadPdf = () => {
    if (reportData.length === 0) return;

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;

    const totalGeral = reportData.reduce((acc, item) => acc + parseInt(item.total_quantity, 10), 0);

    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Produção', 14, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(dataFormatada, 196, 22, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      startY: 30,
      head: [['Descrição', 'Código', 'Qtd']],
      body: reportData.map((item) => [
        item.descricao,
        item.product_code,
        parseInt(item.total_quantity, 10),
      ]),
      styles: {
        fontSize: 10,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [250, 250, 250],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.01,
      },
      alternateRowStyles: {
        fillColor: [215, 215, 215],
      },
    });

    autoTable(doc, {
      body: [['Total de quantidades', totalGeral]],
      theme: 'grid',
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [0, 0, 0], cellWidth: 50 },
        1: { halign: 'center', textColor: [0, 0, 0], cellWidth: 15, fillColor: [215, 215, 215] },
      },
    });

    doc.save(`Relatório_Produção`);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      );
    }

    if (error) return <Alert variant="danger">{error}</Alert>;

    if (reportData.length === 0) {
      return <Alert variant="info">Nenhum produto listado no momento.</Alert>;
    }

    const totalGeral = reportData.reduce((acc, item) => acc + parseInt(item.total_quantity, 10), 0);

    return (
      <>
        <Table bordered hover className="fix-table">
          <thead>
            <tr>
              <th style={{ width: '70%' }}>Descrição</th>
              <th style={{ width: '15%' }}>Código</th>
              <th style={{ width: '15%' }}>Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item) => (
              <tr key={item.product_code} className="production-table">
                <td>{item.descricao}</td>
                <td>{item.product_code}</td>
                <td>{parseInt(item.total_quantity, 10)}</td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Table bordered className="mt-3" style={{ maxWidth: '300px' }}>
          <tbody>
            <tr>
              <td colSpan={4} className="fw-bold">
                Total de quantidades
              </td>
              <td className="product-table-quantity" style={{ backgroundColor: '#dde2e3' }}>
                {totalGeral}
              </td>
            </tr>
          </tbody>
        </Table>

        <div className="d-flex justify-content-end botao-margin">
          <Button
            style={{ borderRadius: '3px' }}
            variant="primary"
            onClick={handleDownloadPdf}
            disabled={reportData.length === 0}
            className="relatorio-button"
          >
            Baixar PDF
          </Button>
        </div>
      </>
    );
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered dialogClassName="meu-modal-custom">
      <Modal.Header closeButton>
        <Modal.Title>Relatório de Produção</Modal.Title>
      </Modal.Header>
      <Modal.Body>{renderContent()}</Modal.Body>
    </Modal>
  );
}
