import React, { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Form, Row, Col, Button, Modal, Container } from 'react-bootstrap';

import api from 'src/services/api';

import ModalEditClient from 'src/components/modals/ModalEditClient';
import ModalCreateClient from 'src/components/modals/ModalCreateClient';

type Cliente = {
  id: number;
  nome: string;
  numeroDocumento?: string;
  telefone?: string;
  endereco?: {
    geral?: {
      municipio?: string;
    };
  };
};

export default function ClientesPage() {
  const [data, setData] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingClientId, setViewingClientId] = useState<number | null>(null);

  const fetchClients = () => {
    setLoading(true);
    setError(null);
    api
      .get<any>('/api/clientes')
      .then((res) => {
        console.log('DADOS DOS CLIENTES RECEBIDOS DO BACKEND:', res.data);
        const responseData = res.data;
        if (Array.isArray(responseData)) {
          setData(responseData as Cliente[]);
        } else {
          console.error('ERRO: /api/clientes não retornou um array', responseData);
          setError('Formato de dados inesperado recebido do servidor.');
          setData([]);
        }
      })
      .catch((err) => {
        console.error('ERRO ao buscar clientes:', err);
        const errorMessage =
          err.response?.data?.mensagem || err.message || 'Falha ao buscar dados dos clientes.';
        setError(errorMessage);
        setData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleShowCreateModal = () => setShowCreateModal(true);

  const handleClientCreated = (newClientFromModal: Cliente) => {
    setData((currentData) => [newClientFromModal, ...currentData]);
  };

  const handleShowViewModal = (clientId: number) => {
    setViewingClientId(clientId);
  };

  const handleCloseViewModal = () => {
    setViewingClientId(null);
  };

  const handleClientUpdated = (updatedClient: Cliente) => {
    setData((currentData) =>
      currentData.map((client) => (client.id === updatedClient.id ? updatedClient : client))
    );
  };

  const filteredClients = data.filter((client) => {
    if (!client || typeof client.nome !== 'string') {
      return false;
    }
    const searchTermLower = searchTerm.toLowerCase();
    const cidade = client.endereco?.geral?.municipio;

    return (
      client.nome.toLowerCase().includes(searchTermLower) ||
      (client.numeroDocumento &&
        typeof client.numeroDocumento === 'string' &&
        client.numeroDocumento.toLowerCase().includes(searchTermLower)) ||
      (client.telefone &&
        typeof client.telefone === 'string' &&
        client.telefone.includes(searchTermLower)) ||
      (client.id && client.id.toString().toLowerCase().includes(searchTermLower)) ||
      (cidade && typeof cidade === 'string' && cidade.toLowerCase().includes(searchTermLower))
    );
  });

  if (loading) {
    return (
      <>
        <title>Contatos - GoStratto</title>
        <Container
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: 'calc(100vh - 200px)' }}
        >
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </Container>
      </>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mt-4">
        Erro ao carregar clientes: {error}
      </Alert>
    );
  }

  const pageTitle = 'Clientes';
  const searchPlaceholder = 'Pesquisar por nome, código ou documento';
  const headerIdCliente = 'Código';
  const headerNome = 'Nome';
  const headerCnpjCpf = 'CNPJ/CPF';
  const headerCidade = 'Cidade';
  const headerTelefone = 'Telefone';

  return (
    <>
      <title>Contatos - GoStratto</title>
      <Container className="mb-4">
        <div>
          <div
            className="mt-5 mb-5"
            style={{
              background: 'linear-gradient(135deg, #2453dc 0%, #577CFF 100%)',
              color: '#fff',
              padding: '25px',
              borderRadius: '16px',
              maxWidth: '300px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <h3 className="fw-bold mb-0" style={{ color: '#fff' }}>
              {pageTitle}
            </h3>
          </div>
          <Row className="mb-4">
            <Col md={5}>
              <Form.Group>
                <Form.Control
                  className="input-foco-azul form-style"
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col className="d-flex justify-content-end">
              <Button onClick={handleShowCreateModal} className="create-button">
                Cadastrar cliente
              </Button>
            </Col>
          </Row>

          {data.length === 0 && !loading && !error && (
            <Alert variant="info">Nenhum cliente encontrado.</Alert>
          )}
          {filteredClients.length === 0 && data.length > 0 && searchTerm !== '' && (
            <Alert variant="info">{`Nenhum cliente encontrado para o termo "${searchTerm}".`}</Alert>
          )}
          {data.length > 0 && (
            <Table striped hover className="table-style">
              <thead>
                <tr>
                  <th
                    className="text-muted"
                    style={{ width: '45%', fontSize: '0.8em', fontWeight: 'normal' }}
                  >
                    {headerNome}
                  </th>
                  <th
                    className="text-muted"
                    style={{ width: '15%', fontSize: '0.8em', fontWeight: 'normal' }}
                  >
                    {headerCnpjCpf}
                  </th>
                  <th
                    className="text-muted"
                    style={{ width: '15%', fontSize: '0.8em', fontWeight: 'normal' }}
                  >
                    {headerCidade}
                  </th>
                  <th
                    className="text-muted"
                    style={{ width: '15%', fontSize: '0.8em', fontWeight: 'normal' }}
                  >
                    {headerTelefone}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleShowViewModal(c.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontSize: '0.9em' }}>{c.nome}</td>
                    <td style={{ fontSize: '0.9em' }}>{c.numeroDocumento || '-'}</td>
                    <td style={{ fontSize: '0.9em' }}>{c.endereco?.geral?.municipio || '-'}</td>
                    <td style={{ fontSize: '0.9em' }}>{c.telefone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          <ModalCreateClient
            show={showCreateModal}
            onHide={handleCloseCreateModal}
            onClientCreated={handleClientCreated}
          />

          <ModalEditClient
            show={!!viewingClientId}
            onHide={handleCloseViewModal}
            clientId={viewingClientId}
            onClientUpdated={handleClientUpdated}
          />
        </div>
      </Container>
    </>
  );
}
