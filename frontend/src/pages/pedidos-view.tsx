import React from 'react';
import { useEffect, useState } from 'react';
import {
  Table,
  Spinner,
  Alert,
  Form,
  Badge,
  Modal,
  Button,
  Row,
  Col,
  ListGroup,
  Dropdown,
  Container,
  InputGroup,
} from 'react-bootstrap';

import api from 'src/services/api';
import { generateOrderPdf } from 'src/services/pdfService';

import { Iconify } from 'src/components/iconify';

type ClienteDoPedidoDetalhado = {
  id: number;
  nome: string;
  tipoPessoa?: string;
  numeroDocumento?: string;
  fone?: string;
};

type ItemDoPedidoDetalhado = {
  id: number;
  codigo?: string;
  unidade?: string;
  quantidade: number;
  desconto?: number;
  valor: number;
  descricao: string;
  descricaoDetalhada?: string;
  produto: {
    id: number;
  };
  comissao?: {
    base?: number;
    aliquota?: number;
    valor?: number;
  };
};

type ParcelaDoPedido = {
  id: number;
  dataVencimento: string;
  valor: number;
  observacoes?: string;
  formaPagamento: {
    id: number;
    // descricao?: string;
  };
};
type VendedorDoPedido = {
  id: number;
  // nome?: string
};

type PedidoDetalhado = {
  id: number;
  numero: number | string;
  numeroLoja?: string;
  data: string;
  dataSaida?: string;
  dataPrevista?: string;
  totalProdutos: number;
  total: number;
  contato: ClienteDoPedidoDetalhado;
  situacao: {
    id: number;
    valor?: number;
  };
  loja?: { id: number | string };
  numeroPedidoCompra?: string;
  outrasDespesas?: number;
  observacoes?: string;
  observacoesInternas?: string;
  desconto?: {
    valor: number;
    unidade: string;
  };
  categoria?: { id: number };
  notaFiscal?: { id: number };
  tributacao?: {
    totalICMS?: number;
    totalIPI?: number;
  };
  itens: ItemDoPedidoDetalhado[];
  parcelas: ParcelaDoPedido[];
  transporte?: any;
  vendedor?: VendedorDoPedido;
  intermediador?: any;
  taxas?: any;
  dados_completos_json?: {
    itens: ItemDoPedidoDetalhado[];
  };
};

type ProdutoEncontrado = {
  id: number;
  descricao: string;
  codigo?: string;
  valor: number;
};

type PedidoResumido = {
  id: number;
  numero: string;
  data_pedido: string;
  cliente_nome: string;
  total: number;
  status_id: number;
};

type CondicaoPagamento = {
  id: number;
  descricao: string;
};

const mapSituacaoPedido = (idSituacao?: number): string => {
  if (idSituacao === undefined || idSituacao === null) return 'N/A';
  switch (idSituacao) {
    case 6:
      return 'Em aberto';
    case 9:
      return 'Atendido';
    case 12:
      return 'Cancelado';
    case 47722:
      return 'Orçamento';
    case 49956:
      return 'Venda consignada';
    case 24:
      return 'Verificado';
    case 464197:
      return 'Natal 2025';
    default:
      return `ID ${idSituacao}`;
  }
};

const getSituacaoBadgeStyle = (idSituacao?: number): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    fontSize: '0.8em',
    padding: '0.5em 0.75em',
    color: '#fff',
    fontWeight: 600,
  };

  switch (idSituacao) {
    case 6:
      return { ...baseStyle, backgroundColor: '#fff1c7', color: '#833f12' };
    case 9:
      return { ...baseStyle, backgroundColor: '#b5e667', color: '#355313' };
    case 12:
      return { ...baseStyle, backgroundColor: '#ffe5e3', color: '#cc291c' };
    case 47722:
      return { ...baseStyle, backgroundColor: '#a725ee', color: '#edfefe' };
    case 464197:
      return { ...baseStyle, backgroundColor: '#f70202', color: '#ffffff' };
    case 49956:
      return { ...baseStyle, backgroundColor: '#35dffd', color: '#000000' };
    case 24:
      return { ...baseStyle, backgroundColor: '#def3fc', color: '#0680c4' };
    default:
      return { ...baseStyle, backgroundColor: '#6c757d' };
  }
};

const CustomToggle = React.forwardRef(({ children, onClick }: any, ref: any) => (
  <a
    href=""
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
    className="text-secondary"
  >
    {children}
  </a>
));

export default function PedidosView() {
  const [selectedPedidoDetalhes, setSelectedPedidoDetalhes] = useState<PedidoDetalhado | null>(
    null
  );
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [errorDetalhes, setErrorDetalhes] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<PedidoResumido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedPedido, setEditedPedido] = useState<PedidoDetalhado | null>(null);
  const [editingQuantities, setEditingQuantities] = useState<Record<number, string>>({});
  const [showUnsaveChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [editingDesconto, setEditingDesconto] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemSearchTerm, setNewItemSearchTerm] = useState('');
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<ProdutoEncontrado[]>([]);
  const [downloadingPdfId, setDownloadingPdfId] = useState<number | null>(null);
  const [listaFormasPagamento, setListaFormasPagamento] = useState<
    { id: number; descricao: string }[]
  >([]);
  const [listaCondicoesPagamento, setListaCondicoesPagamento] = useState<CondicaoPagamento[]>([]);
  const [selectedCondicaoId, setSelectedCondicaoId] = useState<string>('');

  useEffect(() => {
    getPedidos(currentPage, submittedSearch, statusFilter);
  }, [currentPage, submittedSearch, statusFilter]);

  useEffect(() => {
    if (newItemSearchTerm.length < 2) {
      setModalSearchResults([]);
      return undefined;
    }

    setIsLoadingSearch(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/api/produtos', {
          params: { search: newItemSearchTerm },
        });
        const produtosEncontrados = res.data.data.map((p: any) => ({
          id: p.id,
          descricao: p.nome,
          codigo: p.codigo,
          valor: parseFloat(p.preco) || 0,
        }));
        setModalSearchResults(produtosEncontrados);
      } catch (err) {
        console.error('Erro ao buscar produtos para o modal:', err);
        setModalSearchResults([]);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
    };
  }, [newItemSearchTerm]);

  useEffect(() => {
    const fetchFormasPagamento = async () => {
      try {
        const response = await api.get('/api/utils/formas-pagamento');
        if (Array.isArray(response.data)) {
          setListaFormasPagamento(response.data);
        }
      } catch (err) {
        console.error('Erro ao buscar formas de pagamento para o modal:', err);
      }
    };

    fetchFormasPagamento();
  }, []);

  useEffect(() => {
    const fetchCondicoesPagamento = async () => {
      try {
        const response = await api.get('/api/utils/condicoes-pagamento');
        if (Array.isArray(response.data)) {
          setListaCondicoesPagamento(response.data);
        }
      } catch (err) {
        console.error('Erro ao buscar condições de pagamento', err);
      }
    };

    fetchCondicoesPagamento();
  }, []);

  const handleVerDetalhesPedido = async (pedidoId: number) => {
    console.log(`Buscando detalhes para o pedido ID: ${pedidoId}`);
    setLoadingDetalhes(true);
    setErrorDetalhes(null);
    setShowDetalhesModal(true);

    try {
      const response = await api.get<PedidoDetalhado>(`/api/pedidos/${pedidoId}`);
      if (response.data && response.data.id) {
        const pedido = response.data;
        setSelectedPedidoDetalhes(pedido);
        setEditedPedido(JSON.parse(JSON.stringify(pedido)));
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.mensagem ||
        err.message ||
        `Falha ao buscar detalhes do pedido ${pedidoId}.`;
      setErrorDetalhes(errorMessage);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const handleCloseModal = () => {
    setShowDetalhesModal(false);
    setSelectedPedidoDetalhes(null);
    setErrorDetalhes(null);
    setEditedPedido(null);
    setEditingQuantities({});
    setIsAddingItem(false);
    setNewItemSearchTerm('');
    setSelectedCondicaoId('');
  };

  const handleAttemptClose = () => {
    const hasUnsavedChanges =
      isOrderEditable && JSON.stringify(selectedPedidoDetalhes) !== JSON.stringify(editedPedido);

    if (hasUnsavedChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      handleCloseModal();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editedPedido) return;

    const { name, value } = e.target;

    if (name === 'contato.nome') {
      setEditedPedido({
        ...editedPedido,
        contato: {
          ...editedPedido.contato,
          nome: value,
        },
      });
    }
  };

  const startEditingQuantity = (item: ItemDoPedidoDetalhado) => {
    const formattedValue = item.quantidade.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    setEditingQuantities((prev) => ({
      ...prev,
      [item.id]: formattedValue,
    }));
  };

  const uptadedEditingQuantity = (itemId: number, value: string) => {
    setEditingQuantities((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const commitQuantityChange = (itemId: number) => {
    if (!editedPedido) return;

    const rawValue = editingQuantities[itemId];
    if (rawValue === undefined || rawValue.trim() === '') {
      const { [itemId]: _, ...rest } = editingQuantities;
      setEditingQuantities(rest);
      return;
    }

    const newQuantity = parseFloat(rawValue.replace(',', '.')) || 0;

    const updatedItens = editedPedido.itens.map((item) => {
      if (item.id === itemId) {
        return { ...item, quantidade: newQuantity };
      }
      return item;
    });

    setEditedPedido({
      ...editedPedido,
      itens: updatedItens,
    });

    const { [itemId]: _, ...rest } = editingQuantities;
    setEditingQuantities(rest);
  };

  const handleRemoveItem = (ItemIdToRemove: number) => {
    if (!editedPedido) return;

    if (window.confirm('Tem certeza que deseja remover este item?')) {
      const updatedItens = editedPedido.itens.filter((item) => item.id !== ItemIdToRemove);
      setEditedPedido({
        ...editedPedido,
        itens: updatedItens,
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    setSubmittedSearch(searchTerm);
  };

  const handleSaveChanges = async () => {
    if (!editedPedido) return;

    setLoadingDetalhes(true);

    try {
      const response = await api.put(`/api/pedidos/${editedPedido.id}`, editedPedido);
      console.log('Resposta do backend:', response.data);

      await getPedidos();

      alert('Alterações salvas com sucesso!');
      handleCloseModal();
    } catch (err: any) {
      const errorMessage = err.response?.data?.mensagem || 'Falha ao salvar as alterações.';
      alert(`Erro: ${errorMessage}`);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const handleProductSelect = (produto: ProdutoEncontrado) => {
    if (!editedPedido) return;

    const novoItem: ItemDoPedidoDetalhado = {
      id: -Date.now(),
      descricao: produto.descricao,
      codigo: produto.codigo,
      valor: produto.valor,
      quantidade: 1,
      unidade: 'UN',
      produto: {
        id: produto.id,
      },
    };

    setEditedPedido({
      ...editedPedido,
      itens: [...editedPedido.itens, novoItem],
    });

    setIsAddingItem(false);
    setNewItemSearchTerm('');
  };

  const handleDownloadPdf = async (pedidoId: number) => {
    setDownloadingPdfId(pedidoId);
    try {
      const response = await api.get<PedidoDetalhado>(`/api/pedidos/${pedidoId}`);

      if (response.data && response.data.id) {
        generateOrderPdf(response.data);
      } else {
        throw new Error('Não foi possível obter os dados detalhados do pedido');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Falha ao gerar o PDF do pedido.';
      alert(`Erro: ${errorMessage}`);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleStatusSelectChange = (novoStatusId: number) => {
    if (!editedPedido) return;

    setEditedPedido((prev) => ({
      ...prev!,
      situacao: {
        ...(prev!.situacao || {}),
        id: novoStatusId,
      },
    }));
  };

  const handleGerarParcelas = () => {
    if (!editedPedido || !selectedCondicaoId) return;

    const regrasDeParcelamento: Record<string, number[]> = {
      '3359853': [7],
      '2076718': [30],
      '2076727': [60],
      '2076783': [30],
      '7758544': [1],
      '4421026': [7, 14],
      '2076737': [28, 35],
      '2091116': [30, 45],
      '3514108': [30, 45, 60],
      '2076738': [28, 35, 42],
      '2076750': [30, 45, 60],
      '2306222': [28, 35, 42, 49],
      '2076765': [28, 35, 42, 49, 56],
      '2127537': [1],
      '7616572': [1],
    };

    const diasParaVencimento = regrasDeParcelamento[selectedCondicaoId];
    if (!diasParaVencimento) {
      alert('Esta condição de pagamento não possui uma regra de geração automática.');
      return;
    }

    const valorTotalDoPedido = totais ? totais.totalDaVenda() : 0;
    const numeroDeParcelas = diasParaVencimento.length;
    const valorPorParcela =
      numeroDeParcelas > 0 ? valorTotalDoPedido / numeroDeParcelas : valorTotalDoPedido;

    const novasParcelas = diasParaVencimento.map((dias) => {
      const dataVencimento = new Date(`${editedPedido.data}T00:00:00`);
      dataVencimento.setDate(dataVencimento.getDate() + dias);

      const ano = dataVencimento.getFullYear();
      const mes = String(dataVencimento.getMonth() + 1).padStart(2, '0');
      const dia = String(dataVencimento.getDate()).padStart(2, '0');

      return {
        id: -Date.now() * Math.random(),
        dataVencimento: `${ano}-${mes}-${dia}`,
        valor: parseFloat(valorPorParcela.toFixed(2)),
        formaPagamento: { id: parseInt(selectedCondicaoId, 10) },
      };
    });

    setEditedPedido((prev) => (prev ? { ...prev, parcelas: novasParcelas } : null));
  };

  const calcularDiferencaDias = (dataPedidoStr: string, dataVencimentoStr: string): number => {
    const dataPedido = new Date(`${dataPedidoStr}T00:00:00`);
    const dataVencimento = new Date(`${dataVencimentoStr}T00:00:00`);
    const diferencaEmMs = dataVencimento.getTime() - dataPedido.getTime();
    const diferencaEmDias = Math.round(diferencaEmMs / (1000 * 60 * 60 * 24));
    return diferencaEmDias;
  };

  const getPedidos = async (page = 1, search = submittedSearch, status = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, search, statusId: status };
      const res = await api.get('/api/pedidos', { params });

      const { data, total, limit } = res.data;

      if (Array.isArray(data)) {
        setPedidos(data);
        setTotalPages(Math.ceil(total / limit));
        setCurrentPage(page);
      } else {
        throw new Error('Formato de dados de pedidos inesperado.');
      }
    } catch (err: any) {
      setError(err.response?.data?.mensagem || 'Falha ao buscar pedidos.');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mt-4">
        Erro ao carregar pedidos: {error}
      </Alert>
    );
  }

  const pageTitle = 'Pedidos de venda';
  const headerNumero = 'Número';
  const headerData = 'Data';
  const headerCliente = 'Cliente';
  const headerTotal = 'Total (R$)';
  const headerSituacao = 'Situação';

  const isOrderEditable =
    selectedPedidoDetalhes?.situacao.id === 6 || selectedPedidoDetalhes?.situacao.id === 47722;

  const totais = editedPedido
    ? {
        numeroDeItens: editedPedido.itens.length,
        somaDasQuantidades: editedPedido.itens.reduce((acc, item) => acc + item.quantidade, 0),
        subtotal: editedPedido.itens.reduce((acc, item) => acc + item.valor * item.quantidade, 0),
        valorDoDesconto: function () {
          const percentualDesconto = editedPedido.desconto?.valor || 0;
          return (this.subtotal * percentualDesconto) / 100;
        },
        totalDaVenda: function () {
          return this.subtotal - this.valorDoDesconto();
        },
      }
    : null;

  return (
    <Container className="mt-4">
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
      <Form onSubmit={handleSearchSubmit}>
        <Row className="align-items-end">
          <Col md={5}>
            <Form.Group className="mb-4">
              <Form.Control
                type="text"
                placeholder="Pesquisar por nome ou n° do pedido"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-foco-azul form-style"
              />
            </Form.Group>
          </Col>
          <Col md={2} className="text-end">
            <Form.Group className="mb-4">
              <Form.Select
                value={statusFilter}
                className="input-foco-azul form-style"
                onChange={(e) => {
                  setCurrentPage(1);
                  setStatusFilter(e.target.value);
                }}
              >
                <option value="">Todos</option>
                <option value="464197">Natal 2025</option>
                <option value="6">Em aberto</option>
                <option value="9">Atendido</option>
                <option value="12">Cancelado</option>
                <option value="47722">Orçamento</option>
                <option value="49956">Venda consignada</option>
                <option value="24">Verificado</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </Form>
      {pedidos.length === 0 && !loading && (
        <Alert variant="info">Nenhum pedido para exibir no momento.</Alert>
      )}

      {pedidos.length > 0 && (
        <Table striped hover responsive className="table-style">
          <thead>
            <tr>
              {/* <th>{headerId}</th> Removido */}
              <th className="fw-normal small text-muted" style={{ width: '6%', fontSize: '0.8em' }}>
                {headerNumero}
              </th>
              <th
                className="fw-normal small text-muted"
                style={{ width: '18%', fontSize: '0.8em' }}
              >
                {headerData}
              </th>
              <th
                className="fw-normal small text-muted"
                style={{ width: '45%', fontSize: '0.8em' }}
              >
                {headerCliente}
              </th>
              <th className="fw-normal small text-muted" style={{ width: '5%', fontSize: '0.8em' }}>
                {headerTotal}
              </th>
              <th
                className="fw-normal small text-muted"
                style={{ textAlign: 'center', width: '30%', fontSize: '0.8em' }}
              >
                {headerSituacao}
              </th>
              <th style={{ width: '5%' }}> </th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr
                key={pedido.id}
                onClick={() => handleVerDetalhesPedido(pedido.id)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ fontSize: '0.9em' }}>{pedido.numero}</td>
                <td style={{ fontSize: '0.9em' }}>{pedido.data_pedido}</td>
                <td style={{ fontSize: '0.9em' }}>{pedido.cliente_nome}</td>
                <td style={{ fontSize: '0.9em' }}>
                  {pedido.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <span
                    className="badge rounded-pill"
                    style={getSituacaoBadgeStyle(pedido.status_id)}
                  >
                    {mapSituacaoPedido(pedido.status_id)}
                  </span>
                </td>

                <td className="text-center align-middle">
                  <Dropdown onClick={(e) => e.stopPropagation()}>
                    <Dropdown.Toggle as={CustomToggle} id={`dropdown-custom-${pedido.id}`}>
                      <Iconify icon="eva:more-vertical-fill" width={20} />
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPdf(pedido.id);
                        }}
                      >
                        {downloadingPdfId === pedido.id ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                            />
                            <span className="ms-2">Gerando...</span>
                          </>
                        ) : (
                          <>Baixar cópia do pedido</>
                        )}
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item href="#/action-3" className="text-danger">
                        Ação Perigosa
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {selectedPedidoDetalhes && (
        <Modal
          show={showDetalhesModal}
          onHide={handleAttemptClose}
          dialogClassName="meu-modal-custom2"
          centered
          style={{ fontSize: '0.90rem' }}
        >
          <Modal.Header closeButton>
            <Modal.Title id="pedido-detalhes-modal-title" style={{ fontWeight: 'bold' }}>
              Pedido de venda - {selectedPedidoDetalhes.numero || selectedPedidoDetalhes.id}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {loadingDetalhes && (
              <div className="text-center p-5">
                <Spinner animation="border" />
              </div>
            )}
            {errorDetalhes && (
              <Alert variant="danger">Erro ao carregar detalhes: {errorDetalhes}</Alert>
            )}
            {!loadingDetalhes && !errorDetalhes && selectedPedidoDetalhes && (
              <div className="form-pequeno">
                <h6 style={{ fontWeight: 'bold' }}>Dados do cliente</h6>

                <Row className="mb-3">
                  <Col md={5}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: '0.8rem' }}>Cliente</Form.Label>
                      <Form.Control
                        type="text"
                        name="contato.nome"
                        readOnly={!isOrderEditable}
                        disabled={!isOrderEditable}
                        value={editedPedido?.contato.nome || ''}
                        onChange={handleInputChange}
                        title={selectedPedidoDetalhes.contato.nome || ''}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: '0.8rem' }}>Data da venda</Form.Label>
                      <Form.Control
                        type="text"
                        readOnly
                        disabled
                        value={(() => {
                          const dataString = selectedPedidoDetalhes.data;
                          const dataCorrigida = new Date(`${dataString}T00:00:00`);
                          return dataCorrigida.toLocaleDateString('pt-BR');
                        })()}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: '0.8rem' }}>Status do pedido</Form.Label>
                      <Form.Select
                        value={editedPedido?.situacao.id || ''}
                        disabled={!isOrderEditable}
                        onChange={(e) => handleStatusSelectChange(Number(e.target.value))}
                      >
                        <option value="6">Em aberto</option>
                        <option value="47722">Orçamento</option>

                        {![6, 47722].includes(selectedPedidoDetalhes?.situacao.id || 0) && (
                          <option value={selectedPedidoDetalhes?.situacao.id}>
                            {mapSituacaoPedido(selectedPedidoDetalhes?.situacao.id)}
                          </option>
                        )}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <h6 style={{ fontWeight: 'bold' }} className="mt-5">
                  Itens do pedido
                </h6>
                {editedPedido?.itens && editedPedido.itens.length > 0 ? (
                  <ListGroup variant="flush" className="mt-2" style={{ gap: '0rem' }}>
                    {editedPedido.itens.map((item, index) => {
                      const editedItem = isOrderEditable
                        ? editedPedido?.itens.find((i) => i.id === item.id)
                        : null;
                      const displayQuantity = editedItem ? editedItem.quantidade : item.quantidade;
                      const displayTotal = editedItem
                        ? displayQuantity * editedItem.valor
                        : item.quantidade * item.valor;

                      return (
                        <ListGroup.Item key={item.id} className="px-0" style={{ border: 0 }}>
                          <Row className="align-items-center g-2">
                            <Col
                              xs="auto"
                              className="d-flex align-items-center justify-content-center"
                            >
                              <div
                                style={{
                                  backgroundColor: '#ced4da',
                                  color: 'white',
                                  fontWeight: 'bold',
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '0.375rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {index + 1}
                              </div>
                            </Col>

                            <Col>
                              <div
                                style={{
                                  border: '1px solid #dee2e6',
                                  borderRadius: '5px',
                                  padding: '0.3rem',
                                  paddingRight: isOrderEditable ? '45px' : '0.4rem',
                                }}
                              >
                                <Row className="align-items-center h-100 d-flex">
                                  <Col className="pe-3 flex-grow-1 border-end">
                                    <div>{item.descricao}</div>
                                  </Col>

                                  <Col
                                    xs={6}
                                    md={2}
                                    className="px-3"
                                    style={{ borderRight: '1px solid #dee2e6' }}
                                  >
                                    <span className="d-md-none fw-bold">Código </span>
                                    {item.codigo || item.produto.id}
                                  </Col>

                                  <Col
                                    xs={6}
                                    md={2}
                                    className="px-3"
                                    style={{ borderRight: '1px solid #dee2e6' }}
                                  >
                                    <span className="d-md-none fw-bold">Quantidade </span>
                                    {isOrderEditable ? (
                                      <Form.Control
                                        type="text"
                                        size="sm"
                                        value={
                                          editingQuantities[item.id] !== undefined
                                            ? editingQuantities[item.id]
                                            : displayQuantity.toLocaleString('pt-BR', {
                                                minimumFractionDigits: 2,
                                              })
                                        }
                                        onFocus={(e) => {
                                          if (editedItem) {
                                            startEditingQuantity(editedItem);
                                          }
                                          setTimeout(() => e.target.select(), 0);
                                        }}
                                        onChange={(e) =>
                                          uptadedEditingQuantity(item.id, e.target.value)
                                        }
                                        onBlur={() => commitQuantityChange(item.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            commitQuantityChange(item.id);
                                            e.currentTarget.blur();
                                          }
                                        }}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          boxShadow: 'none',
                                          textAlign: 'left',
                                          width: '100%',
                                          minWidth: '70px',
                                          color: 'inherit',
                                          fontSize: '0.90rem',
                                        }}
                                      />
                                    ) : (
                                      displayQuantity.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    )}
                                  </Col>

                                  <Col
                                    xs={6}
                                    md={2}
                                    className="px-3"
                                    style={{ borderRight: '1px solid #dee2e6' }}
                                  >
                                    <span className="d-md-none fw-bold">Preço un </span>
                                    {item.valor.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}
                                  </Col>

                                  <Col xs={6} md={2} className="ps-3">
                                    <span className="d-md-none fw-bold">Preço total </span>
                                    {displayTotal.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}
                                  </Col>
                                </Row>
                              </div>
                            </Col>

                            {/* Ícone de lixeira separado da lista */}
                            {isOrderEditable && (
                              <Col xs="auto" className="d-flex align-items-center">
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: '40px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                  }}
                                >
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 text-danger"
                                    onClick={() => handleRemoveItem(item.id)}
                                  >
                                    <img
                                      alt="Remover item"
                                      src="/assets/icons/glass/trash.svg"
                                      style={{ width: '20px', height: '20px' }}
                                    />
                                  </Button>
                                </div>
                              </Col>
                            )}
                          </Row>
                        </ListGroup.Item>
                      );
                    })}

                    {isAddingItem && editedPedido && (
                      <ListGroup.Item className="px-0">
                        <Row className="align-items-center g-2">
                          <Col
                            xs="auto"
                            className="d-flex align-items-center justify-content-center"
                          >
                            <div
                              style={{
                                backgroundColor: '#ced4da',
                                color: 'white',
                                fontWeight: 'bold',
                                width: '30px',
                                height: '30px',
                                borderRadius: '0.375rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {editedPedido.itens.length + 1}
                            </div>
                          </Col>

                          <Col>
                            <div
                              style={{
                                border: '1px solid #dee2e6',
                                borderRadius: '0.5rem',
                                padding: '0.4rem',
                              }}
                            >
                              <Row className="align-items-center h-100 d-flex">
                                <Col
                                  xs={12}
                                  md={4}
                                  className="pe-3"
                                  style={{ borderRight: '1px solid #dee2e6' }}
                                >
                                  <InputGroup>
                                    <Form.Control
                                      type="text"
                                      placeholder="Pesquise por código ou descrição"
                                      className="border-0 shadow-none"
                                      value={newItemSearchTerm}
                                      onChange={(e) => setNewItemSearchTerm(e.target.value)}
                                      autoFocus
                                    />
                                  </InputGroup>
                                </Col>
                                <Col
                                  xs={6}
                                  md={2}
                                  className="px-3"
                                  style={{ borderRight: '1px solid #dee2e6' }}
                                >
                                  ㅤㅤ
                                </Col>
                                <Col
                                  xs={6}
                                  md={2}
                                  className="px-3"
                                  style={{ borderRight: '1px solid #dee2e6' }}
                                >
                                  ㅤㅤ
                                </Col>
                                <Col
                                  xs={6}
                                  md={2}
                                  className="px-3"
                                  style={{ borderRight: '1px solid #e6e0deff' }}
                                >
                                  R$ 0,00
                                </Col>
                                <Col xs={6} md={2} className="ps-3">
                                  R$ 0,00
                                </Col>
                              </Row>

                              {modalSearchResults.length > 0 && (
                                <ListGroup
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    zIndex: 10,
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                  }}
                                  className="shadow-sm"
                                >
                                  {modalSearchResults.map((produto) => (
                                    <ListGroup.Item
                                      key={produto.id}
                                      action
                                      onClick={() => handleProductSelect(produto)}
                                    >
                                      {produto.descricao} <br />
                                      <small className="text-muted">
                                        {' '}
                                        Código: {produto.codigo || 'N/A'} | Preço:{' '}
                                        {(produto.valor || 0).toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL',
                                        })}
                                      </small>
                                    </ListGroup.Item>
                                  ))}
                                </ListGroup>
                              )}
                            </div>
                          </Col>

                          {isOrderEditable && (
                            <Col xs="auto" className="d-flex align-items-center">
                              <div
                                style={{
                                  position: 'absolute',
                                  right: '40px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                }}
                              >
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 text-danger"
                                  onClick={() => setIsAddingItem(false)}
                                >
                                  <i className="bi bi-trash" style={{ fontSize: '1rem' }} />
                                </Button>
                              </div>
                            </Col>
                          )}
                        </Row>
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                ) : (
                  <p className="text-muted">Nenhum item encontrado para este pedido.</p>
                )}

                {isOrderEditable && !isAddingItem && (
                  <div className="mt-2 d-flex justify-content-end">
                    <Button
                      variant="link"
                      size="sm"
                      className="text-success fw-bold p-0 text-decoration-none"
                      style={{ color: '#198754' }}
                      onClick={async () => {
                        setIsAddingItem(true);
                      }}
                    >
                      Adicionar item
                    </Button>
                  </div>
                )}

                <div className="mt-3">
                  <h6 style={{ fontWeight: 'bold' }}>Totais</h6>
                  {totais && (
                    <Row>
                      <Col md={3}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Nº de itens</Form.Label>
                          <Form.Control
                            type="text"
                            readOnly
                            disabled
                            value={totais.numeroDeItens}
                          />
                        </Form.Group>
                      </Col>

                      <Col md={3}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Soma das quantidades</Form.Label>
                          <Form.Control
                            type="text"
                            readOnly
                            disabled
                            value={totais.somaDasQuantidades.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          />
                        </Form.Group>
                      </Col>

                      <Col md={3}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Desconto (%)</Form.Label>
                          <InputGroup>
                            <Form.Control
                              type="text"
                              readOnly={!isOrderEditable}
                              disabled={!isOrderEditable}
                              value={
                                editingDesconto !== null
                                  ? editingDesconto
                                  : editedPedido?.desconto?.valor || 0
                              }
                              onFocus={(e) => {
                                if (!isOrderEditable) return;
                                setEditingDesconto(String(editedPedido?.desconto?.valor || 0));
                                e.target.select();
                              }}
                              onChange={(e) => {
                                setEditingDesconto(e.target.value);
                              }}
                              onBlur={() => {
                                if (editingDesconto === null) return;

                                const novoPercentual =
                                  parseFloat(editingDesconto.replace(',', '.')) || 0;

                                if (editedPedido) {
                                  setEditedPedido({
                                    ...editedPedido,
                                    desconto: {
                                      valor: novoPercentual,
                                      unidade: 'PORCENTAGEM',
                                    },
                                  });
                                }

                                setEditingDesconto(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={3}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Total do pedido</Form.Label>
                          <Form.Control
                            type="text"
                            readOnly
                            disabled
                            className="fw-bold"
                            value={totais
                              .totalDaVenda()
                              .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  )}
                </div>

                {editedPedido && (
                  <div className="mt-5">
                    <h6 style={{ fontWeight: 'bold' }}>Pagamento</h6>

                    {isOrderEditable && (
                      <Row className="align-items-end mb-3">
                        <Col md={7}>
                          <Form.Label className="small text-muted">
                            Condições de pagamento
                          </Form.Label>
                          <Form.Select
                            value={selectedCondicaoId}
                            onChange={(e) => setSelectedCondicaoId(e.target.value)}
                          >
                            <option value="">Selecione para gerar parcelas...</option>
                            {listaCondicoesPagamento.map((condicao) => (
                              <option key={condicao.id} value={condicao.id}>
                                {condicao.descricao}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col md={2}>
                          <Button
                            variant="outline-primary"
                            className="w-100 rounded-3"
                            onClick={handleGerarParcelas}
                            disabled={!selectedCondicaoId}
                          >
                            Gerar parcelas
                          </Button>
                        </Col>
                      </Row>
                    )}

                    <Row className="small text-muted">
                      <Col md={2}>Dias</Col>
                      <Col md={3}>Data</Col>
                      <Col md={2}>Valor</Col>
                      <Col md={5}>Forma</Col>
                      <Col md={1} />
                    </Row>

                    {editedPedido.parcelas.map((parcela, index) => (
                      <Row key={parcela.id} className="mt-2 mb-2 align-items-center">
                        <Col md={2}>
                          <Form.Control
                            type="number"
                            value={calcularDiferencaDias(editedPedido.data, parcela.dataVencimento)}
                            disabled
                            className="campo-bloqueado"
                          />
                        </Col>
                        <Col md={3}>
                          <Form.Control
                            type="date"
                            value={parcela.dataVencimento.split('T')[0]}
                            disabled
                            className="campo-bloqueado"
                          />
                        </Col>
                        <Col md={2}>
                          <Form.Control
                            type="text"
                            value={
                              typeof parcela.valor === 'number'
                                ? parcela.valor.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })
                                : '0,00'
                            }
                            disabled
                            className="campo-bloqueado"
                          />
                        </Col>
                        <Col md={4}>
                          <Form.Select
                            value={parcela.formaPagamento.id}
                            disabled
                            className="campo-bloqueado"
                          >
                            {listaFormasPagamento.map((forma) => (
                              <option key={forma.id} value={forma.id}>
                                {forma.descricao}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                      </Row>
                    ))}
                  </div>
                )}

                <>
                  <h6 style={{ fontWeight: 'bold' }} className="mt-5">
                    Observações
                  </h6>
                  <Form.Group>
                    <Form.Control
                      as="textarea"
                      readOnly={!isOrderEditable}
                      disabled={!isOrderEditable}
                      rows={3}
                      value={editedPedido?.observacoes || ''}
                      onChange={(e) =>
                        setEditedPedido((prev) =>
                          prev ? { ...prev, observacoes: e.target.value } : null
                        )
                      }
                    />
                  </Form.Group>
                </>
                <>
                  <h6 style={{ fontWeight: 'bold' }} className="mt-3">
                    Observações internas
                  </h6>
                  <Form.Group>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      readOnly={!isOrderEditable}
                      disabled={!isOrderEditable}
                      value={editedPedido?.observacoesInternas || ''}
                      onChange={(e) =>
                        setEditedPedido((prev) =>
                          prev ? { ...prev, observacoesInternas: e.target.value } : null
                        )
                      }
                    />
                  </Form.Group>
                </>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {isOrderEditable ? (
              <>
                <Button onClick={handleAttemptClose} className="cancel-button">
                  Cancelar
                </Button>
                <Button onClick={handleSaveChanges} className="save-button">
                  Salvar
                </Button>
              </>
            ) : (
              <Button onClick={handleCloseModal} className="cancel-button">
                Fechar
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      )}
      <Modal
        show={showUnsaveChangesModal}
        onHide={() => setShowUnsavedChangesModal(false)}
        centered
      >
        <Modal.Body className="text-center p-4">
          <h5 className="mb-3">Desaja salvar as alterações?</h5>
          <p className="text-muted">Suas edições serão perdidas se você não as salvar.</p>
        </Modal.Body>

        <Modal.Footer
          className="justify-content-center border-0 gap-2"
          style={{ backgroundColor: '#e9ecef' }}
        >
          <Button
            variant="primary"
            style={{ width: '130px' }}
            onClick={() => {
              handleSaveChanges();
              setShowUnsavedChangesModal(false);
              handleCloseModal();
            }}
          >
            Salvar
          </Button>
          <Button
            variant="light"
            style={{ width: '130px' }}
            onClick={() => {
              handleCloseModal();
              setShowUnsavedChangesModal(false);
            }}
          >
            Não salvar
          </Button>
          <Button
            variant="light"
            style={{ width: '130px' }}
            onClick={() => setShowUnsavedChangesModal(false)}
          >
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
