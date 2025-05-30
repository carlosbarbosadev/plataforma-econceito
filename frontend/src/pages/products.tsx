import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Form } from 'react-bootstrap';
// Se você estiver usando i18next para traduções, descomente e use o hook 't'
// import { useTranslation } from 'react-i18next';

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

export default function Products() {
  // const { t } = useTranslation(); // Para i18n

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

      {filteredProdutos.length === 0 && !loading && (
        <Alert variant="info">
          {searchTerm ? noProductsSearchMsg(searchTerm) : noProductsMsg}
        </Alert>
      )}
      
      <Row xs={1} sm={2} md={3} lg={4} xl={5} className="g-4">
        {filteredProdutos.map(produto => (
          <Col key={produto.id}>
            <Card className="h-100 shadow-sm">
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
    </Container>
  );
}