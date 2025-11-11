import React, { useEffect, useState } from 'react';
import { Spinner, Alert, Form, Row, Col, Button, Modal, InputGroup } from 'react-bootstrap';

import api from 'src/services/api';

const TIPOS_DE_CONTATO = [
  { id: 14570411837, descricao: 'Cliente' },
  { id: 14578457075, descricao: 'Desenvolvedor' },
  { id: 14570411838, descricao: 'Fornecedor' },
  { id: 14570411840, descricao: 'Técnico' },
  { id: 14570411836, descricao: 'Transportador' },
  { id: 14571576008, descricao: 'Clientes E-commerce' },
  { id: 14570468838, descricao: 'Colaborador' },
  { id: 14570472984, descricao: 'Contador' },
  { id: 14570473096, descricao: 'Prestador de Serviços' },
];

const initialNewClientState = {
  // Dados cadastrais
  nome: '',
  fantasia: '',
  ie: '',
  isentoIE: false,
  documento: '',
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
  infocontato: '',
  telefone: '',
  celular: '',
  email: '',
  // Dados adicionais
  tipoContato: '14570411837',
  obs: '',
};

type ModalCreateClientProps = {
  show: boolean;
  onHide: () => void;
  onClientCreated: (newClient: any) => void;
};

export default function ModalCreateClient({
  show,
  onHide,
  onClientCreated,
}: ModalCreateClientProps) {
  const [newClient, setNewClient] = useState(initialNewClientState);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isCepLoading, setIsCepLoading] = useState(false);

  useEffect(() => {
    if (!show) {
      setTimeout(() => {
        setNewClient(initialNewClientState);
        setErrorMessages([]);
        setFormErrors({});
      }, 300);
    }
  }, [show]);

  const handleNewClientChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewClient((prevState) => ({ ...prevState, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleIsentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setNewClient((prevState) => ({
      ...prevState,
      isentoIE: isChecked,
      ie: isChecked ? 'ISENTO' : '',
    }));
  };

  const handleCepSearch = async () => {
    setIsCepLoading(true);
    setErrorMessages([]);
    if (formErrors.cep) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.cep;
        return newErrors;
      });
    }

    const cepLimpo = newClient.cep.replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
      setErrorMessages(['O CEP deve ter 8 dígitos.']);
      setIsCepLoading(false);
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        setErrorMessages(['CEP não encontrado.']);
        setFormErrors((prev) => ({ ...prev, cep: 'CEP não encontrado' }));
      } else {
        setNewClient((prev) => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          municipio: data.localidade || '',
          uf: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setErrorMessages(['Falha ao conectar com o serviço de CEP.']);
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleCreateClient = () => {
    if (!newClient.nome || !newClient.tipo) {
      setErrorMessages(['O campo "Nome" e "Tipo de pessoa" são obrigatórios.']);
      setIsCreating(false);
      return;
    }
    setIsCreating(true);
    setErrorMessages([]);
    setFormErrors({});

    const {
      nome,
      fantasia,
      ie,
      isentoIE,
      documento,
      tipo,
      cep,
      uf,
      municipio,
      bairro,
      endereco,
      numero,
      complemento,
      infocontato,
      telefone,
      celular,
      email,
      tipoContato,
      obs,
    } = newClient;

    const tipoContatoSelecionado = TIPOS_DE_CONTATO.find(
      (item) => item.id.toString() === newClient.tipoContato
    );

    const obsCompleta = [infocontato, obs].filter(Boolean).join(' - ');

    const payload = {
      nome,
      fantasia,
      tipo,
      numeroDocumento: documento,
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
          uf,
        },
      },
      tiposContato: tipoContatoSelecionado ? [tipoContatoSelecionado] : [],
      infocontato: infocontato,
    };

    api
      .post('/api/clientes', payload)
      .then((res) => {
        onClientCreated(res.data);
        onHide();
      })
      .catch((err) => {
        console.error('ERRO ao criar cliente:', err);
        if (err.response && err.response.data) {
          const { message, errors } = err.response.data;

          if (errors) {
            const allErrors = [
              'Não conseguimos salvar o cadastro',
              'Verifique os campos destacados abaixo.',
            ];

            Object.values(errors).forEach((msg) => allErrors.push(msg as string));

            setErrorMessages(allErrors);

            setFormErrors(errors);
          } else {
            setErrorMessages([message || 'Falha ao criar cliente.']);
            setFormErrors({});
          }
        } else {
          setErrorMessages([err.message || 'Falha ao criar cliente...']);
          setFormErrors({});
        }
      })
      .finally(() => {
        setIsCreating(false);
      });
  };

  return (
    <Modal show={show} onHide={onHide} dialogClassName="meu-modal-custom2">
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">Cadastrar cliente</Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-form-sm">
        {errorMessages.length > 0 && (
          <Alert variant="warning">
            <Alert.Heading className="alert-heading">Atenção</Alert.Heading>
            <p className="mb-1" style={{ fontSize: '0.9em', color: '#a16207' }}>
              {errorMessages[0]}
            </p>
            <p style={{ fontSize: '0.9em', color: '#a16207' }}>{errorMessages[1]}</p>

            {errorMessages.length > 2 && (
              <ul className="mb-0" style={{ fontSize: '0.9em', color: '#a16207' }}>
                {errorMessages.slice(2).map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}
        <Form>
          <div className="mb-4 form-pequeno">
            <p className="fw-bold">Dados cadastrais</p>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Nome*</Form.Label>
                  <Form.Control
                    type="text"
                    name="nome"
                    value={newClient.nome}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Fantasia</Form.Label>
                  <Form.Control
                    type="text"
                    name="fantasia"
                    value={newClient.fantasia}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>CPF/CNPJ</Form.Label>
                  <Form.Control
                    type="text"
                    name="documento"
                    value={newClient.documento}
                    onChange={handleNewClientChange}
                    className={formErrors.documento ? 'form-control-warning' : ''}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Tipo da Pessoa*</Form.Label>
                  <Form.Select name="tipo" value={newClient.tipo} onChange={handleNewClientChange}>
                    <option value="F">Pessoa Física</option>
                    <option value="J">Pessoa Jurídica</option>
                    <option value="E">Estrangeiro</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Inscrição Estadual</Form.Label>
                  <Form.Control
                    type="text"
                    name="ie"
                    value={newClient.ie}
                    onChange={handleNewClientChange}
                    disabled={newClient.isentoIE}
                    className={formErrors.ie ? 'form-control-warning' : ''}
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-center pt-3">
                <Form.Group className="mb-3">
                  <Form.Check
                    style={{ fontSize: '0.9rem' }}
                    type="checkbox"
                    name="isentoIE"
                    label="IE Isento"
                    checked={newClient.isentoIE}
                    onChange={handleIsentoChange}
                    className="custom-checkbox-producao"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="mb-4 form-pequeno">
            <p className="fw-bold">Endereço</p>
            <Row>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>CEP</Form.Label>

                  <div className="cep-input-wrapper">
                    <Form.Control
                      type="text"
                      name="cep"
                      value={newClient.cep}
                      onChange={handleNewClientChange}
                      className={formErrors.cep ? 'form-control-warning' : ''}
                    />

                    <Button
                      variant="link"
                      onClick={handleCepSearch}
                      disabled={isCepLoading}
                      className="cep-search-button"
                    >
                      <img
                        src="/assets/icons/glass/search.svg"
                        width="21"
                        alt="Pesquisar Endereço"
                        className="me-2"
                      />
                    </Button>
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Rua</Form.Label>
                  <Form.Control
                    type="text"
                    name="endereco"
                    value={newClient.endereco}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Número</Form.Label>
                  <Form.Control
                    type="text"
                    name="numero"
                    value={newClient.numero}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Bairro</Form.Label>
                  <Form.Control
                    type="text"
                    name="bairro"
                    value={newClient.bairro}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Complemento</Form.Label>
                  <Form.Control
                    type="text"
                    name="complemento"
                    value={newClient.complemento}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Cidade</Form.Label>
                  <Form.Control
                    type="text"
                    name="municipio"
                    value={newClient.municipio}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
              <Col md={1}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>UF</Form.Label>
                  <Form.Control
                    type="text"
                    name="uf"
                    value={newClient.uf}
                    onChange={handleNewClientChange}
                    maxLength={2}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="mb-4 form-pequeno">
            <p className="fw-bold">Contato</p>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Informações do contato</Form.Label>
                  <Form.Control
                    type="text"
                    name="infocontato"
                    value={newClient.infocontato}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>E-Mail</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={newClient.email}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Fone</Form.Label>
                  <Form.Control
                    type="text"
                    name="telefone"
                    value={newClient.telefone}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Celular</Form.Label>
                  <Form.Control
                    type="text"
                    name="celular"
                    value={newClient.celular}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="mb-4 form-pequeno">
            <p className="fw-bold">Dados adicionais</p>
            <Row>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Tipo de Contato</Form.Label>
                  <Form.Select
                    name="tipoContato"
                    value={newClient.tipoContato}
                    onChange={handleNewClientChange}
                  >
                    {TIPOS_DE_CONTATO.map((tipo) => (
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
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="obs"
                    value={newClient.obs}
                    onChange={handleNewClientChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button className="cancel-button" onClick={onHide} disabled={isCreating}>
          Cancelar
        </Button>
        <Button className="save-button" onClick={handleCreateClient} disabled={isCreating}>
          {isCreating ? <Spinner as="span" animation="border" size="sm" /> : 'Salvar'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
