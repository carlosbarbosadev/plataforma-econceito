import React, { useEffect, useState } from "react";
import { Table, Spinner, Alert, Form, Row, Col, Button, Modal, Container } from "react-bootstrap";

import api from "src/services/api";

type Cliente = {
  id: number;
  nome: string;
  numeroDocumento?: string;
  telefone?: string;
  endereco?: {
    geral?: {
      municipio?: string;
    }
  };
};

const TIPOS_DE_CONTATO = [
  { id: 14570411837, descricao: "Cliente" },
  { id: 14578457075, descricao: "Desenvolvedor" },
  { id: 14570411838, descricao: "Fornecedor" },
  { id: 14570411840, descricao: "Técnico" },
  { id: 14570411836, descricao: "Transportador" },
  { id: 14571576008, descricao: "Clientes E-commerce" },
  { id: 14570468838, descricao: "Colaborador" },
  { id: 14570472984, descricao: "Contador" },
  { id: 14570473096, descricao: "Prestador de Serviços" }
]

const initialNewClientState = {
  // Dados cadastrais
  nome: '',
  fantasia: '',
  ie: '',
  isentoIE: false,
  numeroDocumento: '',
  tipo: 'F',
  // Endereço
  cep: '',
  uf: '',
  municipio: '',
  bairro: '',
  endereco: '',
  numero: '',
  complemento: '',
  // Contato
  contato: '',
  telefone: '',
  celular: '',
  email: '',
  // Dados adicionais
  tipoContato: '14570411837',
  obs: ''
};

export default function ClientesPage() {
  const [data, setData] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClient, setNewClient] = useState(initialNewClientState);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchClients = () => {
    setLoading(true);
    setError(null);
    api.get<any>('/api/clientes')
      .then(res => {
        console.log("DADOS DOS CLIENTES RECEBIDOS DO BACKEND:", res.data);
        const responseData = res.data;
        if (Array.isArray(responseData)) {
          setData(responseData as Cliente[]);
        } else {
          console.error('ERRO: /api/clientes não retornou um array', responseData);
          setError('Formato de dados inesperado recebido do servidor.');
          setData([]);
        }
      })
      .catch(err => {
        console.error('ERRO ao buscar clientes:', err);
        const errorMessage = err.response?.data?.mensagem || err.message || 'Falha ao buscar dados dos clientes.';
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
    setNewClient(initialNewClientState);
    setCreateError(null);
  };

  const handleShowCreateModal = () => setShowCreateModal(true);

  const handleNewClientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewClient(prevState => ({ ...prevState, [name]: value }));
  };

  const handleIsentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setNewClient(prevState => ({
      ...prevState,
      isentoIE: isChecked,
      ie: isChecked ? '' : prevState.ie
    }));
  };

  const handleCreateClient = () => {
    if (!newClient.nome || !newClient.tipo) {
      setCreateError('O campo "Nome" e "Tipo de pessoa" são obrigatórios.');
      return;
    }
    setIsCreating(true);
    setCreateError(null);

    const {
      nome, fantasia, ie, isentoIE, numeroDocumento, tipo,
      cep, uf, municipio, bairro, endereco, numero, complemento,
      contato, telefone, celular, email, tipoContato, obs
    } = newClient;

    const tipoContatoSelecionado = TIPOS_DE_CONTATO.find(
      (item) => item.id.toString() === newClient.tipoContato
    );

    const obsCompleta = [contato, obs].filter(Boolean).join(' - ');

    const payload = {
      nome,
      fantasia,
      tipo,
      numeroDocumento,
      ie: isentoIE ? 'ISENTO' : ie,
      indicadorIe: isentoIE ? 2 : 1,
      situacao: 'A',
      email,
      telefone,
      celular,
      observacoes: obsCompleta,
      endereco: {
        geral: {
          endereco,
          numero,
          complemento,
          bairro,
          cep,
          municipio,
          uf
        }
      },
      tiposContato: tipoContatoSelecionado ? [tipoContatoSelecionado] : [],
    };

    api.post('/api/clientes', payload)
      .then(res => {
        setData(currentData => [res.data, ...currentData]);
        handleCloseCreateModal();
      })
      .catch(err => {
        console.error('ERRO ao criar cliente:', err);
        const errorMessage = err.response?.data?.mensagem || err.message || 'Falha ao criar cliente. Verifique os dados.';
        setCreateError(errorMessage);
      })
      .finally(() => {
        setIsCreating(false);
      });
  };

  const filteredClients = data.filter(client => {
    if (!client || typeof client.nome !== 'string') {
      return false;
    }
    const searchTermLower = searchTerm.toLowerCase();
    const cidade = client.endereco?.geral?.municipio;

    return (
      client.nome.toLowerCase().includes(searchTermLower) ||
      (client.numeroDocumento && typeof client.numeroDocumento === 'string' && client.numeroDocumento.toLowerCase().includes(searchTermLower)) ||
      (client.telefone && typeof client.telefone === 'string' && client.telefone.includes(searchTermLower)) ||
      (client.id && client.id.toString().toLowerCase().includes(searchTermLower)) ||
      (cidade && typeof cidade === 'string' && cidade.toLowerCase().includes(searchTermLower))
    );
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="mt-4">Erro ao carregar clientes: {error}</Alert>
  }

  const pageTitle = 'Clientes';
  const searchPlaceholder = 'Pesquisar por nome, código ou documento';
  const headerIdCliente = 'Código';
  const headerNome = 'Nome';
  const headerCnpjCpf = 'CNPJ/CPF';
  const headerCidade = 'Cidade';
  const headerTelefone = 'Telefone';

  return (
    <Container className="mb-4">
    <div>
      <div className="mt-5 mb-4" style={{ background: 'linear-gradient(135deg, #2453dc 0%, #577CFF 100%)', color: '#fff', padding: '25px', borderRadius: '16px', maxWidth: '250px', display: 'flex', justifyContent: 'center' }}>
        <h3 className="fw-bold mb-0" style={{ color: '#fff', marginBottom: '0' }}>
          {pageTitle}
        </h3>
      </div>
      <Row className="mb-5">
        <Col md={5}>
          <Form.Group>
            <Form.Control
              className="input-foco-azul"
              style={{ borderRadius: '4px' }}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Form.Group>
        </Col>
      <Col className="d-flex justify-content-end">
        <Button
          variant="primary"
          onClick={handleShowCreateModal}
          style={{
            borderRadius: '4px',
            backgroundColor: '#4CAF50',
            borderColor: '#4CAF50',
          }}
        >
          Criar cliente
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
        <Table striped hover>
          <thead>
            <tr>
              <th className="text-muted" style={{ width: '10%', fontSize: '0.8em', fontWeight: 'normal' }}>{headerIdCliente}</th>
              <th className="text-muted" style={{ width: '45%', fontSize: '0.8em', fontWeight: 'normal' }}>{headerNome}</th>
              <th className="text-muted" style={{ width: '15%', fontSize: '0.8em', fontWeight: 'normal' }}>{headerCnpjCpf}</th>
              <th className="text-muted" style={{ width: '15%', fontSize: '0.8em', fontWeight: 'normal' }}>{headerCidade}</th>
              <th className="text-muted" style={{ width: '15%', fontSize: '0.8em', fontWeight: 'normal' }}>{headerTelefone}</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(c => (
              <tr key={c.id}>
                <td style={{ fontSize: '0.9em' }}>{c.id}</td>
                <td style={{ fontSize: '0.9em' }}>{c.nome}</td>
                <td style={{ fontSize: '0.9em' }}>{c.numeroDocumento || '-'}</td>
                <td style={{ fontSize: '0.9em' }}>{c.endereco?.geral?.municipio || '-'}</td>
                <td style={{ fontSize: '0.9em' }}>{c.telefone || '-'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showCreateModal} onHide={handleCloseCreateModal} dialogClassName="modal-largo" contentClassName="modal-com-bordas-destacadas">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="fw-bold">Criar novo cliente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createError && <Alert variant="danger">{createError}</Alert>}
          <Form>
            <div className="mb-4 mt-4 form-pequeno">
              <p className="fw-bold">Dados cadastrais</p>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: '0.8rem' }}>Nome*</Form.Label>
                    <Form.Control type="text" name="nome" value={newClient.nome} onChange={handleNewClientChange} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: '0.8rem' }}>Fantasia</Form.Label>
                    <Form.Control type="text" name="fantasia" value={newClient.fantasia} onChange={handleNewClientChange} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: '0.8rem' }}>CPF/CNPJ</Form.Label>
                    <Form.Control type="text" name="numeroDocumento" value={newClient.numeroDocumento} onChange={handleNewClientChange} />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                 <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: '0.8rem' }}>Tipo de pessoa*</Form.Label>
                    <Form.Select name="tipo" value={newClient.tipo} onChange={handleNewClientChange}>
                      <option value="F">Pessoa Física</option>
                      <option value="J">Pessoa Jurídica</option>
                    </Form.Select>
                  </Form.Group>
                 </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                   <Form.Label style={{ fontSize: '0.8rem' }}>Inscrição Estadual</Form.Label>
                   <Form.Control type="text" name="ie" value={newClient.ie} onChange={handleNewClientChange} disabled={newClient.isentoIE} />
                  </Form.Group>
                </Col>
                <Col md={4} className="d-flex align-items-center pt-3">
                  <Form.Group className="mb-3">
                    <Form.Check style={{ fontSize: '0.9rem' }} type="checkbox" name="isentoIE" label="Isento" checked={newClient.isentoIE} onChange={handleIsentoChange} />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            <div className="mb-4 form-pequeno">
              <p className="fw-bold">Endereço</p>
              <Row>
                <Col md={2}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>CEP</Form.Label><Form.Control type="text" name="cep" value={newClient.cep} onChange={handleNewClientChange} /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>Rua</Form.Label><Form.Control type="text" name="endereco" value={newClient.endereco} onChange={handleNewClientChange} /></Form.Group></Col>
                <Col md={2}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>Número</Form.Label><Form.Control type="text" name="numero" value={newClient.numero} onChange={handleNewClientChange} /></Form.Group></Col>
              </Row>
              <Row>
                <Col md={4}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>Bairro</Form.Label><Form.Control type="text" name="bairro" value={newClient.bairro} onChange={handleNewClientChange} /></Form.Group></Col>
                <Col md={4}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>Complemento</Form.Label><Form.Control type="text" name="complemento" value={newClient.complemento} onChange={handleNewClientChange} /></Form.Group></Col>
                <Col md={3}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>Cidade</Form.Label><Form.Control type="text" name="municipio" value={newClient.municipio} onChange={handleNewClientChange} /></Form.Group></Col>
                <Col md={1}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>UF</Form.Label><Form.Control type="text" name="uf" value={newClient.uf} onChange={handleNewClientChange} maxLength={2} /></Form.Group></Col>
              </Row>
            </div>

            <div className="mb-4 form-pequeno">
              <p className="fw-bold">Contato</p>
              <Row>
                <Col md={4}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>Informação do contato</Form.Label><Form.Control type="text" name="contato" value={newClient.contato} onChange={handleNewClientChange} /></Form.Group></Col>
                <Col md={4}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>Email</Form.Label><Form.Control type="email" name="email" value={newClient.email} onChange={handleNewClientChange} /></Form.Group></Col>
              </Row>
              <Row>
                <Col md={2}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>Telefone</Form.Label><Form.Control type="text" name="telefone" value={newClient.telefone} onChange={handleNewClientChange} /></Form.Group></Col>
                <Col md={2}><Form.Group className="mb-3"><Form.Label style={{ fontSize: '0.8rem' }}>Celular</Form.Label><Form.Control type="text" name="celular" value={newClient.celular} onChange={handleNewClientChange} /></Form.Group></Col>
              </Row>
            </div>

            <div className="mb-4 form-pequeno">
              <p className="fw-bold">Dados adicionais</p>
              <Row>
                <Col md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: '0.8rem' }}>Tipo de contato</Form.Label>
                    <Form.Select name="tipoContato" value={newClient.tipoContato} onChange={handleNewClientChange}>
                      {TIPOS_DE_CONTATO.map(tipo => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.descricao}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: '0.8rem' }}>Observações</Form.Label>
                    <Form.Control as="textarea" rows={3} name="obs" value={newClient.obs} onChange={handleNewClientChange} />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCreateModal} disabled={isCreating}>Cancelar</Button>
          <Button variant="primary" onClick={handleCreateClient} disabled={isCreating}>
            {isCreating ? <Spinner as="span" animation="border" size="sm" /> : 'Salvar cliente'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
    </Container>
  );
}