import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  InputGroup,
  ListGroup,
  Badge,
  Spinner,
  Container,
  Card,
  ProgressBar,
  Dropdown,
} from 'react-bootstrap';

import { Alert } from '@mui/material';

import { useAuth } from 'src/hooks/useAuth';

import api from 'src/services/api';

type Campanha = {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  meta_vendas: number | null;
  produtos_ids: number[] | null;
  imagem_url: string | null;
  descricao: string | null;
  condicoes: string[] | null;
};

type Produto = {
  id: number;
  nome: string;
  codigo?: string;
  preco: number;
  imagem_url?: string | null;
};

export function CampanhasView() {
  const { isAdmin } = useAuth();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [novaCampanha, setNovaCampanha] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    meta_vendas: '',
    produtos: [] as number[],
    condicoes: ['', '', ''],
  });

  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<Produto[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [produtosSelecionados, setProdutosSelecionados] = useState<Produto[]>([]);
  const [campanhaEmEdicao, setCampanhaEmEdicao] = useState<Campanha | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);
  const [produtosDaCampanha, setProdutosDaCampanha] = useState<Produto[]>([]);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [progresso, setProgresso] = useState({ vendasAtuais: 0, progressoPercentual: 0 });

  const fetchCampanhas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/campanhas');
      setCampanhas(response.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar campanhas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampanhas();
  }, []);

  useEffect(() => {
    if (termoBuscaProduto.length < 2) {
      setResultadosBusca([]);
      return () => {};
    }

    setLoadingBusca(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/api/produtos/search-for-campaign', {
          params: { search: termoBuscaProduto },
        });
        const novosResultados = res.data.filter(
          (p: Produto) => !produtosSelecionados.some((sp) => sp.id === p.id)
        );
        setResultadosBusca(novosResultados);
      } catch (err) {
        console.error('Erro ao buscar produtos:', err);
      } finally {
        setLoadingBusca(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [termoBuscaProduto, produtosSelecionados]);

  const handleOpenCreateModal = () => {
    setCampanhaEmEdicao(null);
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNovaCampanha({
      nome: '',
      descricao: '',
      data_inicio: '',
      data_fim: '',
      meta_vendas: '',
      produtos: [],
      condicoes: ['', '', ''],
    });
    setProdutosSelecionados([]);
    setTermoBuscaProduto('');
    setResultadosBusca([]);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNovaCampanha((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelecionarProduto = (produto: Produto) => {
    setProdutosSelecionados((prev) => [...prev, produto]);
    setNovaCampanha((prev) => ({ ...prev, produtos: [...prev.produtos, produto.id] }));
    setTermoBuscaProduto('');
    setResultadosBusca([]);
  };

  const handleRemoverProduto = (produtoId: number) => {
    const novaListaVisual = produtosSelecionados.filter((p) => p.id !== produtoId);
    setProdutosSelecionados(novaListaVisual);

    const novaListaDeIds = novaListaVisual.map((p) => p.id);

    setNovaCampanha((prev) => ({ ...prev, produtos: novaListaDeIds }));
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...novaCampanha,
        meta_vendas: novaCampanha.meta_vendas ? parseInt(novaCampanha.meta_vendas) : null,
      };

      console.log('DADOS SENDO ENVIADOS PARA A API:', payload);

      if (campanhaEmEdicao) {
        await api.put(`/api/campanhas/${campanhaEmEdicao.id}`, payload);
        alert('Campanha atualizada com sucesso!');
      } else {
        await api.post('/api/campanhas', payload);
        alert('Campanha criada com sucesso!');
      }

      handleCloseCreateModal();
      fetchCampanhas();
    } catch (err: any) {
      const action = campanhaEmEdicao ? 'atualizar' : 'criar';
      alert(`Erro ao ${action} campanha: ${err.response?.data?.mensagem || err.message}`);
    }
  };

  const handleOpenEditModal = async (campanha: Campanha) => {
    setCampanhaEmEdicao(campanha);

    setNovaCampanha({
      nome: campanha.nome,
      descricao: campanha.descricao || '',
      data_inicio: new Date(campanha.data_inicio).toISOString().split('T')[0],
      data_fim: new Date(campanha.data_fim).toISOString().split('T')[0],
      meta_vendas: String(campanha.meta_vendas || ''),
      produtos: campanha.produtos_ids || [],
      condicoes: campanha.condicoes || ['', '', ''],
    });

    setProdutosSelecionados([]);

    if (campanha.produtos_ids && campanha.produtos_ids.length > 0) {
      try {
        const resProdutos = await api.get('/api/produtos/by-ids', {
          params: { ids: campanha.produtos_ids.join(',') },
        });
        setProdutosSelecionados(resProdutos.data);
      } catch (err) {
        console.error('Erro ao buscar produtos da campanha para edição:', err);
        alert('Não foi possível carregar os produtos associados a esta campanha.');
      }
    }
    setShowCreateModal(true);
  };

  const handleExcluirCampanha = async (id: number) => {
    if (
      window.confirm('Tem certeza que deseja excluir esta campanha? A ação não pode ser desfeita.')
    ) {
      try {
        await api.delete(`/api/campanhas/${id}`);
        alert('Campanha excluída com sucesso!');
        fetchCampanhas();
      } catch (err: any) {
        alert(`Erro ao excluir campanha: ${err.message}`);
      }
    }
  };

  const handleCondicaoChange = (index: number, value: string) => {
    setNovaCampanha((prev) => {
      const novasCondicoes = [...prev.condicoes];
      novasCondicoes[index] = value;
      return { ...prev, condicoes: novasCondicoes };
    });
  };

  const handleVerDetalhes = async (campanha: Campanha) => {
    setCampanhaSelecionada(campanha);
    setShowDetalhesModal(true);
    setLoadingDetalhes(true);

    try {
      const promessas = [];

      if (campanha.produtos_ids && campanha.produtos_ids.length > 0) {
        promessas.push(
          api.get('/api/produtos/by-ids', {
            params: { ids: campanha.produtos_ids.join(',') },
          })
        );
      } else {
        promessas.push(Promise.resolve({ data: [] }));
      }

      promessas.push(api.get(`/api/campanhas/${campanha.id}/progresso`));

      const [resProdutos, resProgresso] = await Promise.all(promessas);

      setProdutosDaCampanha(resProdutos.data);
      setProgresso(resProgresso.data);
    } catch (err) {
      console.error('Erro ao buscar detalhes da campanha', err);
      setProdutosDaCampanha([]);
      setProgresso({ vendasAtuais: 0, progressoPercentual: 0 });
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const pageTitle = 'Campanhas';

  const vendasAtuais = 17000;

  let progressoPercentual = 0;
  if (
    campanhaSelecionada &&
    campanhaSelecionada.meta_vendas &&
    campanhaSelecionada.meta_vendas > 0
  ) {
    progressoPercentual = (vendasAtuais / campanhaSelecionada.meta_vendas) * 100;
  }

  return (
    <>
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
            <Col className="d-flex justify-content-end">
              {isAdmin && (
                <Button
                  variant="primary"
                  onClick={handleOpenCreateModal}
                  style={{
                    borderRadius: '4px',
                    backgroundColor: '#4CAF50',
                    borderColor: '#4CAF50',
                  }}
                  className="rounded-3"
                >
                  Criar campanha
                </Button>
              )}
            </Col>
          </Row>

          {loading && (
            <div
              className="d-flex justify-content-center align-items-center"
              style={{ minHeight: '200px' }}
            >
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Carregando...</span>
              </Spinner>
            </div>
          )}

          {error && (
            <Alert severity="error" className="mt-4">
              Erro ao carregar campanhas: {error}
            </Alert>
          )}

          {!loading && !error && (
            <Row
              xs={1}
              md={2}
              lg={3}
              className="g-4 align-items-center justify-content-center"
              style={{ minHeight: '50vh' }}
            >
              {campanhas.length > 0 ? (
                campanhas.map((campanha) => (
                  <Col key={campanha.id}>
                    <Card className="h-100 shadow-sm card-campanha rounded-5 border-sutil">
                      <Card.Img
                        variant="top"
                        src={
                          campanha.imagem_url ||
                          'https://via.placeholder.com/600x200/cccccc/ffffff?text=Sem+Imagem'
                        }
                        alt="Imagem da campanha"
                        className="rounded-top-5"
                        style={{
                          height: '200px',
                          objectFit: 'cover',
                        }}
                      />
                      <Card.Body className="d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start">
                          <Card.Title className="fw-bold mb-3">{campanha.nome}</Card.Title>

                          {isAdmin && (
                            <Dropdown>
                              <Dropdown.Toggle
                                variant="link"
                                size="sm"
                                id={`dropdown-campanha-${campanha.id}`}
                                className="p-0 text-secondary no-caret"
                              >
                                <img
                                  src="/assets/icons/glass/more-vertical.svg"
                                  width="25"
                                  alt="Mais"
                                />
                              </Dropdown.Toggle>

                              <Dropdown.Menu align="end">
                                <Dropdown.Item onClick={() => handleOpenEditModal(campanha)}>
                                  Editar
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onClick={() => handleExcluirCampanha(campanha.id)}
                                  className="text-danger"
                                >
                                  Excluir
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          )}
                        </div>

                        <div className="d-flex align-items-center text-muted mb-2">
                          <small>
                            {new Date(campanha.data_inicio).toLocaleDateString('pt-BR')}
                            {' - '}
                            {new Date(campanha.data_fim).toLocaleDateString('pt-BR')}
                          </small>
                        </div>

                        <div className="d-flex align-items-center text-muted mb-3">
                          <small>
                            Meta:{' '}
                            {campanha.meta_vendas
                              ? Number(campanha.meta_vendas).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })
                              : 'N/A'}
                          </small>
                        </div>
                        <div className="mt-auto pt-3 d-flex justify-content-center">
                          <Button
                            className="btn-custom-azul rounded-3"
                            onClick={() => handleVerDetalhes(campanha)}
                            style={{ minWidth: '150px' }}
                          >
                            Ver Detalhes
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))
              ) : (
                <Col xs={12}>
                  <div
                    className="d-flex justify-content-center align-items-center"
                    style={{ minHeight: '50vh' }}
                  >
                    <div className="text-center">
                      <h5 className="fw-bold">Nenhuma campanha ativa no momento</h5>
                      <p className="text-muted">Aguarde novas atualizações em breve.</p>
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          )}
        </div>
      </Container>

      <Modal
        show={showCreateModal}
        onHide={handleCloseCreateModal}
        size="lg"
        centered
        dialogClassName="modal-margin-top"
        contentClassName="modal-com-bordas-destacadas"
      >
        <Form onSubmit={handleSaveCampaign}>
          <Modal.Header closeButton closeVariant="white">
            <Modal.Title className="fw-bold">
              {campanhaEmEdicao ? 'Editar Campanha' : 'Criar Campanha'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="modal-form-sm form-pequeno">
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: '0.8rem' }}>Nome da campanha</Form.Label>
              <Form.Control
                type="text"
                name="nome"
                value={novaCampanha.nome}
                onChange={handleFormChange}
                required
                autoFocus
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: '0.8rem' }}>Descrição</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="descricao"
                value={novaCampanha.descricao}
                onChange={handleFormChange}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Data de Início</Form.Label>
                  <Form.Control
                    type="date"
                    name="data_inicio"
                    value={novaCampanha.data_inicio}
                    onChange={handleFormChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '0.8rem' }}>Data de Fim</Form.Label>
                  <Form.Control
                    type="date"
                    name="data_fim"
                    value={novaCampanha.data_fim}
                    onChange={handleFormChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: '0.8rem' }}>Meta de Vendas (R$)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                name="meta_vendas"
                value={novaCampanha.meta_vendas}
                onChange={handleFormChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: '0.8rem' }}>Condições da campanha</Form.Label>
              <Form.Control
                type="text"
                className="mb-2"
                value={novaCampanha.condicoes[0]}
                onChange={(e) => handleCondicaoChange(0, e.target.value)}
              />
              <Form.Control
                type="text"
                className="mb-2"
                value={novaCampanha.condicoes[1]}
                onChange={(e) => handleCondicaoChange(1, e.target.value)}
              />
              <Form.Control
                type="text"
                className="mb-2"
                value={novaCampanha.condicoes[2]}
                onChange={(e) => handleCondicaoChange(2, e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3 position-relative">
              <Form.Label style={{ fontSize: '0.8rem' }}>Produtos da campanha</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Pesquise por código ou descrição"
                  value={termoBuscaProduto}
                  onChange={(e) => setTermoBuscaProduto(e.target.value)}
                />
                {loadingBusca && (
                  <InputGroup.Text>
                    <Spinner animation="border" size="sm" />
                  </InputGroup.Text>
                )}
              </InputGroup>

              {resultadosBusca.length > 0 && (
                <ListGroup
                  className="mt-1 shadow-sm"
                  style={{
                    position: 'absolute',
                    zIndex: 10,
                    width: '100%',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {resultadosBusca.map((p) => (
                    <ListGroup.Item action key={p.id} onClick={() => handleSelecionarProduto(p)}>
                      {p.nome} <small className="text-muted">({p.codigo})</small>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Form.Group>

            <div className="mt-3">
              <h6>Produtos Selecionados ({produtosSelecionados.length}):</h6>
              {produtosSelecionados.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px' }}>
                  {produtosSelecionados.map((p) => (
                    <Badge key={p.id} pill bg="primary" className="d-flex align-items-center p-2">
                      {p.nome}
                      <Button
                        variant="link"
                        size="sm"
                        className="text-white p-0 ms-2"
                        onClick={() => handleRemoverProduto(p.id)}
                        style={{ lineHeight: 1 }}
                      >
                        <img
                          src="/assets/icons/glass/close.svg"
                          width="17"
                          alt="Remover Produto"
                          className="me-2"
                        />
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted small">Nenhum produto selecionado.</p>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={handleCloseCreateModal} className="btn-custom-cancelar fw-bold">
              <small>Cancelar</small>
            </Button>
            <Button type="submit" className="btn-custom-salvar fw-bold">
              <small>Salvar</small>
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={showDetalhesModal}
        onHide={() => setShowDetalhesModal(false)}
        size="lg"
        centered
        dialogClassName="modal-margin-top"
        contentClassName="modal-com-bordas-destacadas"
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="fw-bold">{campanhaSelecionada?.nome}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingDetalhes ? (
            <div className="text-center">
              <Spinner animation="border" />
            </div>
          ) : (
            <>
              <Row>
                <Col md={7}>
                  <Card className="mb-3 shadow-sm">
                    <Card.Body>
                      <Card.Title as="h6" className="text-muted fw-bold">
                        Descrição
                      </Card.Title>
                      <Card.Text className="small mt-3 mb-3 texto-pre-wrap">
                        {campanhaSelecionada?.descricao || 'Nenhuma descrição fornecida.'}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                  <Card className="mb-3 shadow-sm">
                    <Card.Body>
                      <Card.Title as="h6" className="text-muted fw-bold">
                        Prazos
                      </Card.Title>
                      <div className="d-flex align-items-center mt-3 mb-3">
                        <img
                          src="/assets/icons/glass/calendar.svg"
                          width="20"
                          alt="Prazos"
                          className="me-2"
                        />
                        <div className="small">
                          <span>
                            {campanhaSelecionada &&
                              new Date(campanhaSelecionada.data_inicio).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="mx-2">→</span>
                          <span>
                            {campanhaSelecionada &&
                              new Date(campanhaSelecionada.data_fim).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={5}>
                  <Card className="mb-3 shadow-sm">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <Card.Title as="h6" className="text-muted fw-bold mb-0">
                          Metas
                        </Card.Title>
                        <span className="small">
                          {campanhaSelecionada?.meta_vendas
                            ? Number(campanhaSelecionada.meta_vendas).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small texto-progresso-custom fw-bold">Atingido</span>
                        <span className="fw-bold small texto-progresso-custom">
                          {progresso.vendasAtuais.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                      </div>
                      <ProgressBar
                        now={progresso.progressoPercentual}
                        label={`${progresso.progressoPercentual.toFixed(0)}%`}
                        visuallyHidden
                        className="progress-fino"
                      />
                    </Card.Body>
                  </Card>
                  <Card className="mb-3 shadow-sm">
                    <Card.Body>
                      <Card.Title as="h6" className="text-muted fw-bold">
                        Condições
                      </Card.Title>
                      <ListGroup variant="flush" className="small mt-3 mb-3">
                        {campanhaSelecionada?.condicoes &&
                        campanhaSelecionada.condicoes.length > 0 ? (
                          campanhaSelecionada.condicoes.map(
                            (condicao, index) =>
                              condicao && (
                                <ListGroup.Item
                                  key={index}
                                  className="d-flex align-items-center border-0 px-0"
                                >
                                  <img
                                    src="/assets/icons/glass/circle-check.svg"
                                    width="20"
                                    alt="Condição válida"
                                    className="me-2"
                                  />
                                  {condicao}
                                </ListGroup.Item>
                              )
                          )
                        ) : (
                          <p className="text-muted">Nenhuma condição especificada.</p>
                        )}
                      </ListGroup>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row>
                <Col>
                  <Card className="shadow-sm">
                    <Card.Body>
                      <Card.Title as="h6" className="text-muted fw-bold">
                        Produtos ({produtosDaCampanha.length})
                      </Card.Title>

                      <Row xs={1} md={2} className="g-3 mt-3 mb-3">
                        {produtosDaCampanha.length > 0 ? (
                          produtosDaCampanha.map((p) => (
                            <Col key={p.id}>
                              <div className="d-flex align-items-start bordder rounded-3 h-100">
                                <div style={{ flexShrink: 0 }}>
                                  {p.imagem_url ? (
                                    <Card.Img
                                      src={p.imagem_url}
                                      alt={p.nome}
                                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                      className="rounded"
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: '60px',
                                        height: '60px',
                                        backgroundColor: '#f8f9fa',
                                      }}
                                      className="d-flex align-items-center justify-content-center rounded"
                                    >
                                      <img
                                        src="/assets/icons/glass/image-placeholder.svg"
                                        width="15"
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="ms-3 flex-grow-1">
                                  <div className="small">{p.nome}</div>
                                  <div className="fw-bold" style={{ fontSize: '0.75rem' }}>
                                    Código: {p.codigo}
                                  </div>
                                </div>
                              </div>
                            </Col>
                          ))
                        ) : (
                          <Col xs={12}>
                            <p className="text-muted small text-center mt-3">
                              Nenhum produto associado.
                            </p>
                          </Col>
                        )}
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={() => setShowDetalhesModal(false)}
            className="btn-custom-cancelar fw-bold"
          >
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
