import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Form, Button, Popover, Overlay, Pagination, Stack } from 'react-bootstrap';

import api from 'src/services/api';

type Produto = {
  id: number;
  nome: string;
  codigo?: string;
  preco?: number;
  estoque?: {
    saldoVirtualTotal?: number;
  };
  situacao?: string;
  imagemURL?: string;
};

type ItemPedido = {
  idProduto: number;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
};

type ClienteParaSelecao = {
  id: number;
  nome: string;
  numeroDocumento?: string;
  tipoPessoa?: string;
};

type FormaPagamento = {
  id: number;
  descricao: string;
};

export default function ProductsPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [errorProdutos, setErrorProdutos] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [itensDoPedidoAtual, setItensDoPedidoAtual] = useState<ItemPedido[]>([]);
  
  const [listaDeClientes, setListaDeClientes] = useState<ClienteParaSelecao[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true); 
  const [errorClientes, setErrorClientes] = useState<string | null>(null); 
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const [listaFormasPagamento, setListaFormasPagamento] = useState<FormaPagamento[]>([]);
  const [loadingFormasPagamento, setLoadingFormasPagamento] = useState(true);
  const [errorFormasPagamento, setErrorFormasPagamento] = useState<string | null>(null);
  const [selectedFormaPagamentoId, setSelectedFormaPagamentoId] = useState<string>('');
  
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState('');

  // Buscar Clientes
  useEffect(() => {
    setLoadingClientes(true);
    setErrorClientes(null);
    api.get<ClienteParaSelecao[]>('/api/clientes')
      .then(response => {
        console.log('PRODUTOS_PAGE: Clientes recebidos para seleção:', response.data);
        if (Array.isArray(response.data)) {
          setListaDeClientes(response.data);
        } else {
          console.error("PRODUTOS_PAGE ERRO: /api/clientes não retornou um array para o seletor!", response.data);
          setListaDeClientes([]);
          setErrorClientes("Erro ao carregar lista de clientes para seleção.");
        }
      })
      .catch(err => {
        console.error("PRODUTOS_PAGE ERRO ao buscar clientes para seleção:", err);
        setErrorClientes(err.response?.data?.mensagem || err.message || "Falha ao buscar clientes para seleção.");
        setListaDeClientes([]);
      })
      .finally(() => setLoadingClientes(false));
  }, []);

  // Buscar formas de pagamento
  useEffect(() => {
    if (!loadingClientes && !errorClientes) {
      setLoadingFormasPagamento(true);
      setErrorFormasPagamento(null);
      api.get<FormaPagamento[]>('/api/utils/formas-pagamento')
        .then(response => {
          console.log('PRODUTOS_PAGE: Formas de Pagamento recebidas:', response.data);
          if (Array.isArray(response.data)) {
            setListaFormasPagamento(response.data);
          } else {
            console.error("PRODUTOS_PAGE ERRO: /api/utils/formas-pagamento não retornou um array!", response.data);
            setListaFormasPagamento([]);
            setErrorFormasPagamento("Erro ao carregar formas de pagamento.");
          }
        })
        .catch(err => {
          console.error("PRODUTOS_PAGE ERRO ao buscar formas de pagamento:", err);
          setErrorFormasPagamento(err.response?.data?.mensagem || err.message || "Falha ao buscar formas de pagamento.");
          setListaFormasPagamento([]);
        })
        .finally(() => setLoadingFormasPagamento(false));
    }
  }, [loadingClientes, errorClientes]);

  // Buscar produtos
  useEffect(() => {
    setLoadingProdutos(true);
    setErrorProdutos(null);

    const params = {
      page: currentPage,
      search: submittedSearchTerm,
    };

    api.get("/api/produtos", { params })
      .then(res => {
        const { data, total } = res.data;
        if (Array.isArray(data)) {
          setProdutos(data);
          const ITEMS_PER_PAGE = 100;
          if (total) {
            setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
          } else {
            setTotalPages(data.length < ITEMS_PER_PAGE ? currentPage : currentPage + 1);
          }
        } else {
          setErrorProdutos("Formato de dados inesperado.")
        }
      })
      .catch(err => {
        setErrorProdutos(err.response?.data?.mensagem || "Falha ao buscar produtos.");
      })
      .finally(() => {
        setLoadingProdutos(false);
      });
  }, [currentPage, submittedSearchTerm]);

  const handleAdicionarAoPedido = (produtoParaAdicionar: Produto) => {
    if (!produtoParaAdicionar.id || produtoParaAdicionar.preco === undefined) {
      console.error("Produto sem ID ou preço para adicionar ao pedido:", produtoParaAdicionar);
      alert("Não é possível adicionar este produto ao pedido (faltam dados).");
      return;
    }
    setItensDoPedidoAtual(itensAnteriores => {
      const itemExistente = itensAnteriores.find(item => item.idProduto === produtoParaAdicionar.id);
      if (itemExistente) {
        return itensAnteriores.map(item =>
          item.idProduto === produtoParaAdicionar.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      } else {
        return [
          ...itensAnteriores,
          {
            idProduto: produtoParaAdicionar.id,
            nomeProduto: produtoParaAdicionar.nome,
            quantidade: 1,
            valorUnitario: produtoParaAdicionar.preco!
          }
        ];
      }
    });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(1);
    setSubmittedSearchTerm(searchTerm);
  };

  const handleFinalizarPedido = async () => {
    if (!selectedClientId) {
      alert('Por favor, selecione um cliente para o pedido.');
      return;
    }
    if (!selectedFormaPagamentoId) {
      alert('Por favor, selecione uma forma de pagamento para o pedido.');
      return;
    }
    if (itensDoPedidoAtual.length === 0) {
      alert('Adicione pelo menos um produto ao pedido.');
      return;
    }
    
    setSubmittingOrder(true);
    // setError(null);

    const valorTotalDoPedido = itensDoPedidoAtual.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0);

    const payloadPedido = {
      idClienteBling: Number(selectedClientId),
      itensPedido: itensDoPedidoAtual.map(item => {
        const produtoOriginal = produtos.find(p => p.id === item.idProduto);
        return {
          idProdutoBling: item.idProduto,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          codigo: produtoOriginal?.codigo || undefined,
          descricao: produtoOriginal?.nome || item.nomeProduto,
        };
      }),
      idFormaPagamentoBling: Number(selectedFormaPagamentoId),
      valorTotalPedido: valorTotalDoPedido,
      observacoes: "Pedido gerado pela plataforma de vendas."
    };

    try {
      console.log('Enviando payload do pedido para /api/pedidos:', JSON.stringify(payloadPedido, null, 2));
      const response = await api.post('/api/pedidos', payloadPedido);
      
      console.log('Pedido criado com sucesso!', response.data);
      alert(`Pedido criado com sucesso no Bling! Número do Pedido: ${response.data.data?.numero || response.data.data?.id || 'Verifique no Bling'}`);

      setItensDoPedidoAtual([]);
      setSelectedClientId('');
      setSelectedFormaPagamentoId('');
      setSearchTerm('');

    } catch (apiError: any) {
      console.error('Erro ao finalizar o pedido:', apiError);
      const errorMessage = apiError.response?.data?.mensagem || apiError.message || 'Falha ao criar o pedido. Tente novamente.';
      alert(`Erro ao criar pedido: ${errorMessage}`);
      // setErrorProdutos(errorMessage);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const handlePredefinedSearch = (term: string) => {
    setSearchTerm(term);
    setSubmittedSearchTerm(term);
    setCurrentPage(1);
  };

  const pageTitle = 'Produtos';
  const searchPlaceholder = 'Buscar produtos por nome ou código';
  const noProductsMsg = 'Nenhum produto para exibir no momento.';
  const noProductsSearchMsg = (term: string) => `Nenhum produto encontrado para "${term}".`;

  if (loadingClientes || loadingFormasPagamento || loadingProdutos) { 
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando Dados da Página...</span>
        </Spinner>
      </Container>
    );
  }

  if (errorClientes || errorFormasPagamento || errorProdutos) { 
    return (
      <Container className="mt-4">
        {errorClientes && <Alert variant="warning">Erro ao carregar clientes: {errorClientes}</Alert>}
        {errorFormasPagamento && <Alert variant="warning" className="mt-2">Erro ao carregar formas de pagamento: {errorFormasPagamento}</Alert>}
        {errorProdutos && <Alert variant="danger" className="mt-2">Erro ao carregar produtos: {errorProdutos}</Alert>}
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <h3 className="fw-bold mb-3">{pageTitle}</h3>
      <p className="fs-5 fw-bold">
        Criar pedido
      </p>
    <Row>
      <Col md={5}>
      <Form.Group className="mb-3" controlId="selecionarCliente">
        <Form.Select
          className="text-muted"
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          disabled={listaDeClientes.length === 0}
        >
          <option value="">Selecione um cliente</option>
          {listaDeClientes.map(cliente => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome} ({cliente.numeroDocumento || 'Doc. N/A'})
            </option>
          ))}
        </Form.Select>
        {listaDeClientes.length === 0 && !loadingClientes && !errorClientes && (
            <Form.Text className="text-muted">Nenhum cliente encontrado para este vendedor.</Form.Text>
        )}
      </Form.Group>
      </Col>
    </Row>

    <Row>
      <Col md={5}>
      <Form.Group controlId="selecionarFormaPagamento">
        <Form.Select
          className="text-muted"
          value={selectedFormaPagamentoId}
          onChange={(e) => setSelectedFormaPagamentoId(e.target.value)}
          disabled={listaFormasPagamento.length === 0 || !selectedClientId}
        >
          <option value="">Selecione uma forma de pagamento</option>
          {listaFormasPagamento.map(forma => (
            <option key={forma.id} value={forma.id}>
              {forma.descricao}
            </option>
          ))}
        </Form.Select>  
        {listaFormasPagamento.length === 0 && !loadingFormasPagamento && !errorFormasPagamento && (
          <Form.Text className="text-muted">Nenhuma forma de pagamento carregada.</Form.Text>
        )}
      </Form.Group>
      </Col>
    </Row>
  <Row>
    <Col md={5}>
    <Form onSubmit={handleSearchSubmit}>
      <Form.Group className="mt-5">
        <Form.Control
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loadingProdutos}
        />
      </Form.Group>
    </Form>
    </Col>
  </Row>

  <Stack direction="horizontal" gap={2} className="mt-4">
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Kraft")}>Kraft</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Branca")}>Branca</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Cake Board")}>Cake Board</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Cake Box")}>Cake Box</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Presente")}>Presente</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Oitavada")}>Oitavada</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Sacola")}>Sacola</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Forminha")}>Forminha</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Tag")}>Tag</Button>
    <Button style={{backgroundColor: '#DC3545', borderColor: '#DC3545', color: '#ffffff'}} size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("")}>Limpar busca</Button>
  </Stack>

      {itensDoPedidoAtual.length > 0 && selectedClientId && selectedFormaPagamentoId && (
        <Alert variant="success" className="mb-1 mt-3">
          <h5>Pedido Atual ({itensDoPedidoAtual.reduce((acc, item) => acc + item.quantidade, 0)} itens):</h5>
          <ul>{itensDoPedidoAtual.map(item => <li key={item.idProduto}>{item.nomeProduto} (Qtd: {item.quantidade}) - R$ {(item.quantidade * item.valorUnitario).toFixed(2)}</li>)}</ul>
          <p><strong>Total: R$ {itensDoPedidoAtual.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0).toFixed(2)}</strong></p>
          <Button
            variant="primary"
            className="mt-2"
            onClick={handleFinalizarPedido}
            disabled={submittingOrder || itensDoPedidoAtual.length === 0 || !selectedClientId || !selectedFormaPagamentoId} 
          >
            {submittingOrder ? 'Enviando Pedido...' : 'Finalizar Pedido'}
          </Button>
        </Alert>
      )}
      
      {!errorProdutos && (
        <>
          {produtos.length === 0 && !loadingProdutos && (
            <Alert variant="info" className="mt-3">
              {searchTerm ? noProductsSearchMsg(searchTerm) : noProductsMsg}
            </Alert>
          )}
          
          {produtos.length > 0 && !loadingProdutos && ( // Só mostra se houver produtos filtrados e não estiver carregando
            <Row xs={1} sm={2} md={3} lg={4} xl={5} className="g-4 mt-0">
              {produtos.map(produto => (
                <Col key={produto.id}>
                  <Card className="h-100 shadow-sm">
                    <Card.Img 
                      variant="top" 
                      src={produto.imagemURL || '/img/placeholder-produto.png'}
                      alt={produto.nome}
                      style={{ height: '180px', objectFit: 'contain', padding: '0.5rem' }} 
                      onError={(e) => { (e.target as HTMLImageElement).src = '/img/placeholder-produto.png'; }}
                    />
                    <Card.Body className="d-flex flex-column">
                      <Card.Title 
                        style={{ fontSize: '1rem', minHeight: '3rem' }}
                        title={produto.nome}
                      >
                        {produto.nome.length > 50 ? `${produto.nome.substring(0, 47)}...` : produto.nome}
                      </Card.Title>
                      <Card.Text as="div" style={{ fontSize: '0.85rem', color: '#555', flexGrow: 1 }}>
                        Código: {produto.codigo || '-'}<br />
                        Preço: <strong>{typeof produto.preco === 'number' 
                          ? produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL',}) 
                          : '-'}</strong><br />
                        Estoque: 
                        {(produto.estoque?.saldoVirtualTotal ?? 0) > 0 ? (
                          <span className="fw-bold"> Disponível</span>
                        ) : (
                          <span className="fw-bold"> Indisponível</span>
                        )}
                        <br />
                      </Card.Text>
                      <Button
                        className="mt-2"
                        onClick={() => handleAdicionarAoPedido(produto)}
                        style={{
                          fontSize: "0.8rem",
                          padding: "0.2rem 0.75rem",
                          backgroundColor: "#4CAF50",
                          borderColor: "#4CAF50"
                        }}
                      >
                        Adicionar ao pedido
                      </Button>
                      
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          {(!loadingProdutos && (produtos.length > 0 || currentPage > 1)) && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.Prev
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 1}
                />
                <Pagination.Item disabled>{`Página ${currentPage}`}</Pagination.Item>
                <Pagination.Next
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={produtos.length < 100}
                />
              </Pagination>
            </div>
          )}

        </>
      )}
      {/* Mensagem se cliente ou forma de pagamento não selecionados e produtos não estão carregando */}
    </Container>
  );
}