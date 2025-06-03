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
  situacao?: string; // 'A' para Ativo, 'I' para Inativo, etc.
  imagemURL?: string; 
};

type ItemPedido = {
  idProduto: number;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
}

export default function Products() {
  // const { t } = useTranslation(); // Para i18n

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [itensDoPedidoAtual, setItensDoPedidoAtual] = useState<ItemPedido[]>([]);
  const [productInPopover, setProductInPopover] = useState<Produto | null>(null);
  const [popoverTarget, setPopoverTarget] = useState<EventTarget & HTMLElement | null>(null);
  
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    api.get<any>('/api/produtos')
      .then(res => {
        console.log('PRODUTOS_PAGE: Dados recebidos de /api/produtos:', res.data);
        const responseData = res.data; 

        if (Array.isArray(responseData)) {
          setProdutos(responseData as Produto[]);
        } else {
          console.error('PRODUTOS_PAGE ERRO: /api/produtos não retornou um array!', responseData);
          setError('Formato de dados de produtos inesperado do servidor.');
          setProdutos([]); 
        }
      })
      .catch(err => {
        console.error('PRODUTOS_PAGE ERRO ao buscar produtos:', err);
        const errorMessage = err.response?.data?.mensagem || err.message || 'Falha ao buscar dados dos produtos.';
        setError(errorMessage);
        setProdutos([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []); // Roda uma vez ao montar o componente
  const handleAdicionarAoPedido = (produtoParaAdicionar: Produto) => {
    if (!produtoParaAdicionar.id || produtoParaAdicionar.preco === undefined) {
      console.error("Produto sem ID ou preço para adicionar ao pedido:", produtoParaAdicionar);
      alert("Não é possível adicionar este produto ao pedido (faltam dados)."); // Feedback para o usuário
      return;
    }
    
    setItensDoPedidoAtual(itensAnteriores => {
      const itemExistente = itensAnteriores.find(item => item.idProduto === produtoParaAdicionar.id);
      if (itemExistente) {
        console.log(`Incrementando quantidade para: ${produtoParaAdicionar.nome}`);
        return itensAnteriores.map(item =>
          item.idProduto === produtoParaAdicionar.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      } else {
        console.log(`Adicionando ao pedido: ${produtoParaAdicionar.nome}`);
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

  const filteredProdutos = produtos.filter(produto => {
    if (!produto || typeof produto.nome !== 'string') return false;
    const term = searchTerm.toLowerCase();
    return (
      produto.nome.toLowerCase().includes(term) ||
      (produto.codigo && produto.codigo.toLowerCase().includes(term)) ||
      (produto.id && produto.id.toString().toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando Produtos...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">Erro ao carregar produtos: {error}</Alert>
      </Container>
    );
  }

  // Textos (podem vir da função t() do i18next)
  const pageTitle = /* t ? t('productsPage.title', 'Produtos') : */ 'Produtos';
  const searchPlaceholder = /* t ? t('productsPage.searchPlaceholder', 'Buscar por nome, código, ID...') : */ 'Buscar por nome, código, ID...';
  const noProductsMsg = /* t ? t('productsPage.noProducts', 'Nenhum produto para exibir no momento.') : */ 'Nenhum produto para exibir no momento.';
  const noProductsSearchMsg = (term: string) => /* t ? t('productsPage.noProductsForTerm', { term }) : */ `Nenhum produto encontrado para "${term}".`;


  return (
    <Container fluid className="mt-4">
      <h2>{pageTitle}</h2>
      <Form.Group className="mb-3 mt-3">
        <Form.Control
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Form.Group>

      {itensDoPedidoAtual.length > 0 && (
        <Alert variant="success" className="mb-3">
          <h5>Pedido Atual ({itensDoPedidoAtual.reduce((acc, item) => acc + item.quantidade, 0)} itens):</h5>
          <ul>
            {itensDoPedidoAtual.map(item => (
              <li key={item.idProduto}>
                {item.nomeProduto} (Qtd: {item.quantidade}) - R$ {(item.quantidade * item.valorUnitario).toFixed(2)}
              </li>
            ))}
          </ul>
          <p><strong> Total: R$ {itensDoPedidoAtual.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0).toFixed(2)}</strong></p>
        </Alert>
      )}

      {filteredProdutos.length === 0 && !loading && (
        <Alert variant="info">
          {searchTerm ? noProductsSearchMsg(searchTerm) : noProductsMsg}
        </Alert>
      )}
      
      <Row xs={1} sm={2} md={3} lg={4} xl={5} className="g-4">
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
                {/* Exemplo de Botão (pode adicionar no futuro)
                <Button variant="primary" size="sm" className="mt-auto">Ver Detalhes</Button> 
                */}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {productInPopover && popoverTarget && (
        <Overlay
          show={!!productInPopover}
          target={popoverTarget}
          placement="bottom-start"
          onHide={closePopover}
          rootClose
          transition={false}
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