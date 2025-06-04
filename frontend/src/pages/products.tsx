import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Form, Button, Popover, Overlay } from 'react-bootstrap';

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
  const [productInPopover, setProductInPopover] = useState<Produto | null>(null);
  const [popoverTarget, setPopoverTarget] = useState<(EventTarget & HTMLElement) | null>(null);
  
  const [listaDeClientes, setListaDeClientes] = useState<ClienteParaSelecao[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true); 
  const [errorClientes, setErrorClientes] = useState<string | null>(null); 
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const [listaFormasPagamento, setListaFormasPagamento] = useState<FormaPagamento[]>([]);
  const [loadingFormasPagamento, setLoadingFormasPagamento] = useState(true);
  const [errorFormasPagamento, setErrorFormasPagamento] = useState<string | null>(null);
  const [selectedFormaPagamentoId, setSelectedFormaPagamentoId] = useState<string>('');
  
  const [submittingOrder, setSubmittingOrder] = useState(false);

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
    if (!loadingFormasPagamento && !errorFormasPagamento) {
      setLoadingProdutos(true);
      setErrorProdutos(null);
      api.get<any>('/api/produtos')
        .then(res => {
          console.log('PRODUTOS_PAGE: Dados recebidos de /api/produtos:', res.data);
          const responseData = res.data; 
          if (Array.isArray(responseData)) {
            setProdutos(responseData as Produto[]);
          } else {
            console.error('PRODUTOS_PAGE ERRO: /api/produtos não retornou um array!', responseData);
            setProdutos([]); 
            setErrorProdutos('Formato de dados de produtos inesperado.');
          }
        })
        .catch(err => { 
          console.error('PRODUTOS_PAGE ERRO ao buscar produtos:', err);
          setErrorProdutos(err.response?.data?.mensagem || err.message || 'Falha ao buscar produtos.'); 
          setProdutos([]);
        })
        .finally(() => setLoadingProdutos(false));
    }
  }, [loadingFormasPagamento, errorFormasPagamento]);

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

  const handleProductCardClick = (event: React.MouseEvent<HTMLElement>, produto: Produto) => {
    setProductInPopover(produto);
    setPopoverTarget(event.currentTarget);
  };

  const closePopover = () => {
    setProductInPopover(null);
    setPopoverTarget(null);
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
      setProductInPopover(null);

    } catch (apiError: any) {
      console.error('Erro ao finalizar o pedido:', apiError);
      const errorMessage = apiError.response?.data?.mensagem || apiError.message || 'Falha ao criar o pedido. Tente novamente.';
      alert(`Erro ao criar pedido: ${errorMessage}`);
      // setErrorProdutos(errorMessage);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredProdutos = produtos.filter(produto => {
    if (!produto || typeof produto.nome !== 'string') return false;
    const term = searchTerm.toLowerCase();
    return (
      produto.nome.toLowerCase().includes(term) ||
      (produto.codigo && produto.codigo.toLowerCase().includes(term)) ||
      (produto.id && produto.id.toString().toLowerCase().includes(term))
    );
  });

  const pageTitle = 'Montar Pedido';
  const searchPlaceholder = 'Buscar produtos por nome, código, ID...';
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
      <h2>{pageTitle}</h2>

      <Form.Group className="my-3" controlId="selecionarCliente">
        <Form.Label>1. Cliente para o Pedido:</Form.Label>
        <Form.Select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          disabled={listaDeClientes.length === 0}
        >
          <option value="">-- Selecione um Cliente --</option>
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

      <Form.Group className="my-3" controlId="selecionarFormaPagamento">
        <Form.Label>2. Forma de Pagamento:</Form.Label>
        <Form.Select
          value={selectedFormaPagamentoId}
          onChange={(e) => setSelectedFormaPagamentoId(e.target.value)}
          disabled={listaFormasPagamento.length === 0 || !selectedClientId}
        >
          <option value="">-- Selecione uma Forma de Pagamento --</option>
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

      <Form.Group className="mb-3 mt-1">
        <Form.Label>3. Adicionar Produtos:</Form.Label>
        <Form.Control
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={!selectedClientId || !selectedFormaPagamentoId || loadingProdutos}
        />
        {(!selectedClientId || !selectedFormaPagamentoId) && !loadingClientes && !loadingFormasPagamento && 
          <Form.Text className="text-info">Selecione um cliente e uma forma de pagamento para adicionar produtos.</Form.Text>}
      </Form.Group>

      {itensDoPedidoAtual.length > 0 && selectedClientId && selectedFormaPagamentoId && (
        <Alert variant="success" className="mb-3">
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
      
      {selectedClientId && selectedFormaPagamentoId && !errorProdutos && ( 
        <>
          {filteredProdutos.length === 0 && !loadingProdutos && (
            <Alert variant="info" className="mt-3">
              {searchTerm ? noProductsSearchMsg(searchTerm) : noProductsMsg}
            </Alert>
          )}
          
          {filteredProdutos.length > 0 && !loadingProdutos && ( // Só mostra se houver produtos filtrados e não estiver carregando
            <Row xs={1} sm={2} md={3} lg={4} xl={5} className="g-4 mt-0">
              {filteredProdutos.map(produto => (
                <Col key={produto.id}>
                  <Card 
                    className="h-100 shadow-sm"
                    onClick={(e) => handleProductCardClick(e, produto)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Img 
                      variant="top" 
                      src={produto.imagemURL || '/img/placeholder-produto.png'}
                      alt={produto.nome}
                      style={{ 
                        height: '180px',
                        objectFit: 'contain',
                        padding: '0.5rem'
                      }} 
                      onError={(e) => { (e.target as HTMLImageElement).src = '/img/placeholder-produto.png'; }}
                    />
                    <Card.Body className="d-flex flex-column">
                      <Card.Title 
                        style={{ fontSize: '1rem', fontWeight: 'bold', minHeight: '3rem' }}
                        title={produto.nome}
                      >
                        {produto.nome.length > 50 ? `${produto.nome.substring(0, 47)}...` : produto.nome}
                      </Card.Title>
                      <Card.Text as="div" style={{ fontSize: '0.85rem', color: '#555', flexGrow: 1 }}>
                        <strong>Código:</strong> {produto.codigo || '-'}<br />
                        <strong>Preço:</strong> {typeof produto.preco === 'number' 
                                              ? produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                              : '-'}<br />
                        <strong>Estoque:</strong> {produto.estoque?.saldoVirtualTotal ?? '-'}<br />
                        <strong>Situação:</strong> {produto.situacao === 'A' ? 'Ativo' : (produto.situacao === 'I' ? 'Inativo' : (produto.situacao || '-'))}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </>
      )}
      {/* Mensagem se cliente ou forma de pagamento não selecionados e produtos não estão carregando */}
      {(!selectedClientId || !selectedFormaPagamentoId) && !loadingProdutos && !errorProdutos && !loadingClientes && !loadingFormasPagamento &&
        <Alert variant="info" className="mt-3">Por favor, selecione um cliente e uma forma de pagamento para visualizar e adicionar produtos.</Alert>
      }


      {productInPopover && popoverTarget && (
        <Overlay
          show={!!productInPopover}
          target={popoverTarget}
          placement="bottom-start" 
          onHide={closePopover}
          rootClose
        >
          {( overlayProps ) => ( 
            <Popover 
              id={`popover-add-${productInPopover.id}`}
              {...overlayProps} 
              style={{...overlayProps.style, zIndex: 1080}}
            >
              <Popover.Body>
                <div className="d-grid">
                  <Button 
                    variant="success"
                    size="sm"
                    onClick={() => {
                      if (productInPopover.situacao !== 'A' || (productInPopover.estoque?.saldoVirtualTotal ?? 0) <= 0) {
                        alert(`Produto "${productInPopover.nome}" não pode ser adicionado (Inativo ou Sem Estoque).`);
                      } else {
                        handleAdicionarAoPedido(productInPopover);
                      }
                      closePopover(); 
                    }}
                  >
                    {`Adicionar "${productInPopover.nome.length > 20 ? `${productInPopover.nome.substring(0, 17)}...` : productInPopover.nome}"`}
                  </Button>  
                </div>
              </Popover.Body>  
            </Popover>
          )}
        </Overlay>
      )}
    </Container>
  );
}