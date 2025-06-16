import { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Form, Badge, Modal, Button, Row, Col, ListGroup } from 'react-bootstrap';
// Se configurou i18next
// import { useTranslation } from 'react-i18next'; 

import api from 'src/services/api';

type ClienteDoPedidoDetalhado = {
  id: number;
  nome: string;
  tipoPessoa?: string;
  numeroDocumento?: string;
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
};

type Pedido = PedidoDetalhado;

const mapSituacaoPedido = (idSituacao?: number): string => {
  if (idSituacao === undefined || idSituacao === null) return 'N/A';
  switch (idSituacao) {
    case 6: return 'Em Aberto';
    case 9: return 'Atendido';
    case 12: return 'Cancelado';
    // Adicionar aqui se eu descobrir mais IDs
    default: return `ID ${idSituacao}`;
  }
};

const getSituacaoBadgeVariant = (idSituacao?: number) : string => {
  if (idSituacao === undefined  || idSituacao === null) return 'secondary';
  switch (idSituacao) {
    case 6: return 'warning';
    case 9: return 'success';
    case 12: return 'danger';
    default: return 'secondary';
  }  
};

export default function PedidosView() {
  const [selectedPedidoDetalhes, setSelectedPedidoDetalhes] = useState<PedidoDetalhado | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [errorDetalhes, setErrorDetalhes] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<PedidoDetalhado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [searchTermPedidos, setSearchTermPedidos] = useState(''); // Se for adicionar busca

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get<any>('/api/pedidos') 
      .then(res => {
        console.log('DEBUG: Dados recebidos de /api/pedidos:', res.data);
        const responseData = res.data; 
        if (Array.isArray(responseData)) {
          setPedidos(responseData as PedidoDetalhado[]);
        } else {
          console.error('ERRO: /api/pedidos não retornou um array!', responseData);
          setError('Formato de dados de pedidos inesperado do servidor.');
          setPedidos([]); 
        }
      })
      .catch(err => {
        console.error('ERRO ao buscar pedidos:', err);
        const errorMessage = err.response?.data?.mensagem || err.message || 'Falha ao buscar dados dos pedidos.';
        setError(errorMessage);
        setPedidos([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleVerDetalhesPedido = async (pedidoId: number) => {
    console.log(`Buscando detalhes para o pedido ID: ${pedidoId}`);
    setLoadingDetalhes(true);
    setErrorDetalhes(null);
    setShowDetalhesModal(true);

    const pedidoDaLista = pedidos.find(p => p.id === pedidoId);
    if (pedidoDaLista && pedidoDaLista.itens && pedidoDaLista.parcelas) {
      console.log('Usando detalhes do pedido já carregados na lista.');
      setSelectedPedidoDetalhes(pedidoDaLista);
      setLoadingDetalhes(false);
      return;
    }

    try {
      const response = await api.get<PedidoDetalhado>(`/api/pedidos/${pedidoId}`);
      if (response.data && response.data.id) {
        setSelectedPedidoDetalhes(response.data);
      } else {
        throw new Error('Formato de resposta inválido')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.mensagem|| err.message || `Falha ao buscar detalhes do pedido ${pedidoId}.`;
      setErrorDetalhes(errorMessage);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const handleCloseModal = () => {
    setShowDetalhesModal(false);
    setSelectedPedidoDetalhes(null);
    setErrorDetalhes(null);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" role="status"><span className="visually-hidden">Carregando Pedidos...</span></Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="mt-4">Erro ao carregar pedidos: {error}</Alert>;
  }

  const pageTitle = 'Meus Pedidos';
  const headerNumero = 'Número';
  const headerData = 'Data';
  const headerCliente = 'Cliente';
  const headerTotal = 'Total (R$)';
  const headerSituacao = 'Situação';


  return (
    <div className="mt-4">
      <h2>{pageTitle}</h2>
      {/* <Form.Group className="mb-3">
        <Form.Control
          type="text"
          placeholder={searchPlaceholder}
          // value={searchTermPedidos}
          // onChange={(e) => setSearchTermPedidos(e.target.value)}
        />
      </Form.Group>
      */}

      {pedidos.length === 0 && !loading && (
        <Alert variant="info">Nenhum pedido para exibir no momento.</Alert>
      )}
      
      {pedidos.length > 0 && (
        <Table striped bordered hover responsive className="mt-3">
          <thead>
            <tr>
              {/* <th>{headerId}</th> Removido */}
              <th>{headerNumero}</th>
              <th>{headerData}</th>
              <th style={{ width: '70%' }}>{headerCliente}</th>
              <th>{headerTotal}</th>
              <th style={{ textAlign: 'center' }}>{headerSituacao}</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map(pedido => (
              <tr key={pedido.id} onClick={() => handleVerDetalhesPedido(pedido.id)}style={{ cursor: 'pointer' }}>  
                {/* <td>{pedido.id}</td> Removido */}
                <td>{pedido.numero}</td>
                <td>{new Date(pedido.data).toLocaleDateString('pt-BR')}</td>
                <td>{pedido.contato.nome}</td>
                <td>{pedido.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <Badge
                    bg={getSituacaoBadgeVariant(pedido.situacao?.id)}
                    pill
                    style={{ fontSize: '0.85em', padding: '0.5em 0.75em' }}>
                      {mapSituacaoPedido(pedido.situacao?.id)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {selectedPedidoDetalhes && (
        <Modal show={showDetalhesModal} onHide={handleCloseModal} dialogClassName="modal-largo" centered>
          <Modal.Header closeButton>
            <Modal.Title id="pedido-detalhes-modal-title" style={{ fontWeight: 'bold' }}>
              Pedido de venda - {selectedPedidoDetalhes.numero || selectedPedidoDetalhes.id}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {loadingDetalhes && (
              <div className="text-center p-5"><Spinner animation="border" /></div>
            )}
            {errorDetalhes && (
              <Alert variant="danger">Erro ao carregar detalhes: {errorDetalhes}</Alert>
            )}
            {!loadingDetalhes && !errorDetalhes && selectedPedidoDetalhes && (
              <div>
                <h5 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>
                  Dados do Pedido
                </h5>

                <Row className="mb-3">
                  <Col md={5}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: '0.8rem' }}>Cliente</Form.Label>
                      <Form.Control
                        type="text"
                        readOnly
                        disabled
                        value={selectedPedidoDetalhes.contato.nome || 'N/A'}
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
                        value={new Date(selectedPedidoDetalhes.data).toLocaleDateString('pt-BR')}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr />
                
                <h6 style={{ fontWeight: 'bold' }}>Itens do Pedido</h6>
                {selectedPedidoDetalhes.itens && selectedPedidoDetalhes.itens.length > 0 ? (
                  <ListGroup variant="flush" className="mt-2" style={{ gap: '0rem' }}>
                    <ListGroup.Item className="d-none d-md-block border-0 px-0">
                      <Row className="align-items-center g-2">
                        <Col xs="auto">
                          <div style={{ width: '40px' }}></div>
                        </Col>
                      <Col>
                        <Row className="text-muted" style={{ fontSize: '0.8rem' }}>
                        <Col md={4}>Descrição</Col>
                        <Col md={2} style={{ paddingLeft: '0' }}>Código</Col>
                        <Col md={2} style={{ paddingLeft: '0' }}>Quantidade</Col>
                        <Col md={2} style={{ paddingLeft: '0' }}>Preço un</Col>
                        <Col md={2} style={{ paddingLeft: '0' }}>Preço total</Col>
                      </Row>
                    </Col>
                  </Row>
                </ListGroup.Item>

                {selectedPedidoDetalhes.itens.map((item, index) => (
                  <ListGroup.Item key={item.id} className="px-0" style={{ border: 0 }}>
                    <Row className="align-items-center g-2">
                      <Col xs="auto" className="d-flex align-items-center justify-content-center">
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
                      <div style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '0.5rem',
                        padding: '0.4rem'
                      }}>
                        <Row className="align-items-center h-100">
                          <Col xs={12} md={4} className="pe-3" style={{ borderRight: '1px solid #dee2e6' }}>
                            <div>{item.descricao}</div>
                          </Col>

                          <Col xs={6} md={2} className="text-muted px-3" style={{ borderRight: '1px solid #dee2e6' }}>
                            <span className="d-md-none fw-bold">Código </span>{item.codigo || item.produto.id}
                          </Col>

                          <Col xs={6} md={2} className="px-3" style={{ borderRight: '1px solid #dee2e6' }}>
                            <span className="d-md-none fw-bold">Quantidade </span>{item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Col>

                          <Col xs={6} md={2} className="px-3" style={{ borderRight: '1px solid #dee2e6' }}>
                            <span className="d-md-none fw-bold">Preço un </span>{item.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                          </Col>

                          <Col xs={6} md={2} className="ps-3">
                            <span className="d-md-none fw-bold">Preço total </span>{(item.quantidade * item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </Col>
                        </Row>
                      </div>
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p className="text-muted">Nenhum item encontrado para este pedido.</p>
          )}

            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
      )}
    </div>
  );
}