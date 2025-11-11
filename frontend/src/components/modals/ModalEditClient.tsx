import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Alert, Container } from 'react-bootstrap';

import api from 'src/services/api';

type ModalEditClientProps = {
  show: boolean;
  onHide: () => void;
  clientId: number | null;
  onClientUpdated: (updatedClient: any) => void;
};

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

const formatarData = (timestamp: string) => {
  if (!timestamp) return '';
  try {
    const data = new Date(timestamp);
    const dataLocal = new Date(data.valueOf() + data.getTimezoneOffset() * 60000);
    return dataLocal.toLocaleDateString('pt-BR');
  } catch (e) {
    return 'Data inválida';
  }
};

export default function ModalEditClient({
  show,
  onHide,
  clientId,
  onClientUpdated,
}: ModalEditClientProps) {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (show && clientId) {
      setLoading(true);
      setFormData(null);
      setLoadError(null);
      setErrorMessages([]);
      setFormErrors({});

      api
        .get(`/api/clientes/${clientId}`)
        .then((res) => {
          setFormData({
            ...res.data,
            infocontato: res.data.infocontato || '',
            observacoes: res.data.observacoes || '',
            tipoContato: res.data.tiposContato?.[0]?.id || '14570411837',
            documento: res.data.numeroDocumento || '',
            isentoIE: res.data.indicadorIe === 2 || res.data.ie === 'ISENTO',
          });
        })
        .catch((err) => {
          console.error('ERRO ao buscar detalhes do cliente:', err);
          const errorMessage =
            err.response?.data?.mensagem || err.message || 'Falha ao buscar dados do cliente.';
          setLoadError(errorMessage);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [show, clientId]);

  const handleClose = () => {
    onHide();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const keys = name.split('.');

      setFormData((prev: any) => {
        const newState = { ...prev };
        let currentLevel = newState;

        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          currentLevel[key] = { ...(currentLevel[key] || {}) };
          currentLevel = currentLevel[key];
        }

        currentLevel[keys[keys.length - 1]] = value;
        return newState;
      });
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }

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
    setFormData((prev: any) => ({
      ...prev,
      isentoIE: isChecked,
      ie: isChecked ? 'ISENTO' : '',
    }));
  };

  const handleSave = () => {
    if (!clientId) return;

    setIsSaving(true);
    setErrorMessages([]);
    setFormErrors({});

    const payload = {
      ...formData,
      numeroDocumento: formData.documento,
      ie: formData.isentoIE ? 'ISENTO' : formData.ie,
      indicadorIe: formData.isentoIE ? 2 : 1,
      endereco: {
        geral: {
          endereco: formData.endereco?.geral?.endereco,
          numero: formData.endereco?.geral?.numero,
          complemento: formData.endereco?.geral?.complemento,
          bairro: formData.endereco?.geral?.bairro,
          cep: formData.endereco?.geral?.cep,
          municipio: formData.endereco?.geral?.municipio,
          uf: formData.endereco?.geral?.uf,
        },
      },

      tiposContato: [TIPOS_DE_CONTATO.find((item) => item.id.toString() === formData.tipoContato)],
    };

    api
      .put(`/api/clientes/${clientId}`, payload)
      .then((res) => {
        onClientUpdated(res.data);
        onHide();
      })
      .catch((err) => {
        console.error('ERRO ao atualizar cliente (FRONTEND):', err);
        if (err.response && err.response.data) {
          const { message, errors } = err.response.data;
          if (errors) {
            const allErrors = [
              'Não conseguimos salvar as alterações',
              'Verifique os campos destacados abaixo.',
            ];
            Object.values(errors).forEach((msg) => allErrors.push(msg as string));
            setErrorMessages(allErrors);
            setFormErrors(errors);
          } else {
            setErrorMessages([message || 'Falha ao salvar.']);
            setFormErrors({});
          }
        } else {
          setErrorMessages([err.message || 'Falha ao salvar.']);
          setFormErrors({});
        }
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Container
          style={{ minHeight: '300px' }}
          className="d-flex justify-content-center align-items-center"
        >
          <Spinner animation="border" />
        </Container>
      );
    }

    if (loadError) {
      return <Alert variant="danger">Erro ao carregar detalhes: {loadError}</Alert>;
    }

    if (formData) {
      return (
        <Form>
          {errorMessages.length > 0 && (
            <Alert variant="warning">
              <Alert.Heading style={{ fontWeight: 'bold' }}>Atenção</Alert.Heading>
              <p className="mb-1">{errorMessages[0]}</p>
              <p>{errorMessages[1]}</p>
              {errorMessages.length > 2 && (
                <ul className="mb-0">
                  {errorMessages.slice(2).map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
              )}
            </Alert>
          )}

          <div className="mb-4 form-pequeno">
            <p className="fw-bold">Dados cadastrais</p>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Nome*</Form.Label>
                  <Form.Control
                    type="text"
                    name="nome"
                    value={formData.nome || ''}
                    onChange={handleChange}
                    className={formErrors.nome ? 'form-control-warning' : ''}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Fantasia</Form.Label>
                  <Form.Control
                    type="text"
                    name="fantasia"
                    value={formData.fantasia || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>CPF/CNPJ</Form.Label>
                  <Form.Control
                    type="text"
                    name="documento"
                    value={formData.documento || ''}
                    onChange={handleChange}
                    className={formErrors.documento ? 'form-control-warning' : ''}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Tipo da Pessoa*</Form.Label>
                  <Form.Select name="tipo" value={formData.tipo} onChange={handleChange}>
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
                    value={formData.ie || ''}
                    onChange={handleChange}
                    className={formErrors.ie ? 'form-control-warning' : ''}
                    disabled={formData.isentoIE}
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
                    checked={formData.isentoIE || false}
                    onChange={handleIsentoChange}
                    className="custom-checkbox-producao"
                  />
                </Form.Group>
              </Col>
              <Col md={1}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Cliente Desde</Form.Label>
                  <Form.Control
                    type="text"
                    readOnly
                    disabled
                    value={formatarData(formData.data_cadastro)}
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
                  <Form.Control
                    type="text"
                    name="endereco.geral.cep"
                    value={formData.endereco?.geral?.cep || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Rua</Form.Label>
                  <Form.Control
                    type="text"
                    name="endereco.geral.endereco"
                    value={formData.endereco?.geral?.endereco || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Número</Form.Label>
                  <Form.Control
                    type="text"
                    name="endereco.geral.numero"
                    value={formData.endereco?.geral?.numero || ''}
                    onChange={handleChange}
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
                    name="endereco.geral.bairro"
                    value={formData.endereco?.geral?.bairro || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Complemento</Form.Label>
                  <Form.Control
                    type="text"
                    name="endereco.geral.complemento"
                    value={formData.endereco?.geral?.complemento || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Cidade</Form.Label>
                  <Form.Control
                    type="text"
                    name="endereco.geral.municipio"
                    value={formData.endereco?.geral?.municipio || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={1}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>UF</Form.Label>
                  <Form.Control
                    type="text"
                    name="endereco.geral.uf"
                    value={formData.endereco?.geral?.uf || ''}
                    maxLength={2}
                    onChange={handleChange}
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
                    value={formData.infocontato || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
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
                    value={formData.telefone}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Celular</Form.Label>
                  <Form.Control
                    type="text"
                    name="celular"
                    value={formData.celular}
                    onChange={handleChange}
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
                  <Form.Label style={{ fontSize: '0.8rem' }}>Tipo de contato</Form.Label>
                  <Form.Select
                    name="tipoContato"
                    value={formData.tipoContato}
                    onChange={handleChange}
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
                    name="observacoes"
                    value={formData.observacoes || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </Form>
      );
    }
    return null;
  };

  return (
    <Modal show={show} onHide={handleClose} dialogClassName="meu-modal-custom2">
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">Editar cliente</Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-form-sm">{renderContent()}</Modal.Body>
      <Modal.Footer>
        <Button className="cancel-button" onClick={handleClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button className="save-button" onClick={handleSave} disabled={loading || isSaving}>
          {isSaving ? <Spinner as="span" animation="border" size="sm" /> : 'Salvar'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
