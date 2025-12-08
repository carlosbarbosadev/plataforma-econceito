import * as XLSX from 'xlsx';
import React, { useState, useRef } from 'react';
import { Modal, Button, Form, Alert, Table, Badge, Spinner } from 'react-bootstrap';

import api from 'src/services/api';

type Produto = {
  id: number;
  codigo?: string;
  nome: string;
  preco?: number;
};

type ModalImportOrderProps = {
  show: boolean;
  onHide: () => void;
  onImportItems: (items: any[]) => void;
};

type ImportItem = {
  codigo: string;
  quantidade: number;
  produtoEncontrado?: Produto;
  status: 'valido' | 'nao_encontrado';
  abaOrigem: string;
};

export default function ModalImportOrder({ show, onHide, onImportItems }: ModalImportOrderProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ImportItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setPreviewData([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const rawItems: { codigo: string; quantidade: number; aba: string }[] = [];
      const codigosParaBuscar: string[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rawCodigo = row[0];
          const rawQtde = row[2];

          if (rawCodigo) {
            const codigoString = String(rawCodigo).trim();
            const quantidade = parseInt(rawQtde) || 0;

            if (quantidade > 0) {
              rawItems.push({
                codigo: codigoString,
                quantidade: quantidade,
                aba: sheetName,
              });
              codigosParaBuscar.push(codigoString);
            }
          }
        }
      });

      if (rawItems.length === 0) {
        setError('Nenhum item com quantidade válida foi encontrado nas abas.');
        setLoading(false);
        return;
      }

      const codigosUnicos = [...new Set(codigosParaBuscar)];

      const response = await api.post('/api/produtos/validar-importacao', {
        codigos: codigosUnicos,
      });

      const produtosEncontrados: Produto[] = response.data;

      const finalItems: ImportItem[] = rawItems.map((itemExcel) => {
        const produtoSistema = produtosEncontrados.find(
          (p) => p.codigo && p.codigo.toUpperCase() === itemExcel.codigo.toUpperCase()
        );

        return {
          codigo: itemExcel.codigo,
          quantidade: itemExcel.quantidade,
          produtoEncontrado: produtoSistema,
          status: produtoSistema ? 'valido' : 'nao_encontrado',
          abaOrigem: itemExcel.aba,
        };
      });

      setPreviewData(finalItems);
    } catch (err) {
      console.error(err);
      setError('Erro ao processar o arquivo. Tente novamente.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    const validItems = previewData.filter((item) => item.status === 'valido');

    const itemsToadd = validItems.map((item) => ({
      idProduto: item.produtoEncontrado!.id,
      nomeProduto: item.produtoEncontrado!.nome,
      codigoProduto: item.produtoEncontrado!.codigo,
      quantidade: item.quantidade,
      valorUnitario: item.produtoEncontrado!.preco || 0,
    }));

    onImportItems(itemsToadd);
    handleClose();
  };

  const handleClose = () => {
    setPreviewData([]);
    setError(null);
    onHide();
  };

  const totalValidos = previewData.filter((i) => i.status === 'valido').length;
  const totalErro = previewData.filter((i) => i.status === 'nao_encontrado').length;

  return (
    <Modal show={show} onHide={handleClose} dialogClassName="meu-modal-custom3" centered>
      <Modal.Header closeButton>
        <Modal.Title>Importar pedido</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {previewData.length === 0 ? (
          <>
            <Alert variant="info" className="mb-4">
              <p className="mb-1">
                <strong>Instruções</strong>
              </p>
              <ul className="mb-0 pl-3">
                <li>
                  A importação deve ser realizada <strong>exclusivamente</strong> utilizando
                  planilhas fornecidas pela <strong>Embalagens Conceito.</strong>
                </li>
                <li>
                  O sistema lerá <strong>todas as abas</strong> da planilha.
                </li>
                <li>Serão importados apenas produtos com quantidade maior que 0.</li>
              </ul>
            </Alert>

            <Form.Group controlId="formFile" className="mb-3 d-flex justify-content-center">
              <Form.Control
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="upload-button"
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Enviar arquivos'}
              </Button>
            </Form.Group>
          </>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <p className="mb-0" style={{ fontSize: 15 }}>
                Prévia da importação
              </p>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table bordered hover size="sm" style={{ fontSize: '0.9rem' }}>
                <thead className="top-0 bg-white">
                  <tr>
                    <th className="fw-normal text-muted" style={{ fontSize: 13 }}>
                      Linha
                    </th>
                    <th className="fw-normal text-muted" style={{ fontSize: 13 }}>
                      Código
                    </th>
                    <th className="fw-normal text-muted" style={{ fontSize: 13 }}>
                      Produto
                    </th>
                    <th className="text-center fw-normal text-muted" style={{ fontSize: 13 }}>
                      Qtd
                    </th>
                    <th className="text-center fw-normal text-muted" style={{ fontSize: 13 }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: '0.9rem' }}>{item.abaOrigem}</td>
                      <td style={{ fontSize: '0.9rem' }}>{item.codigo}</td>
                      <td style={{ fontSize: '0.9rem' }}>
                        {item.produtoEncontrado ? (
                          <span className="text-muted fw-bold">{item.produtoEncontrado.nome}</span>
                        ) : (
                          <span className="text-muted fst-italic">Produto não encontrado</span>
                        )}
                      </td>
                      <td className="text-center" style={{ fontSize: '0.9rem' }}>
                        {item.quantidade}
                      </td>
                      <td className="text-center" style={{ fontSize: '0.9rem' }}>
                        {item.status === 'valido' ? (
                          <Badge bg="success" style={{ borderRadius: '4px' }}>
                            OK
                          </Badge>
                        ) : (
                          <Badge bg="danger" style={{ borderRadius: '4px' }}>
                            ERRO
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {totalErro > 0 && (
              <Alert variant="warning" className="mt-2 py-2">
                <div>
                  <strong>Atenção</strong>
                </div>
                {totalErro === 1
                  ? '1 item não foi encontrado no sistema e será ignorado.'
                  : `${totalErro} itens não foram encontrados no sistema e serão ignorados.`}
              </Alert>
            )}
          </>
        )}

        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button className="cancel-button" onClick={handleClose}>
          Cancelar
        </Button>
        {previewData.length > 0 && (
          <Button
            className="save-button"
            disabled={totalValidos === 0}
            onClick={handleConfirmImport}
          >
            Confirmar
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
