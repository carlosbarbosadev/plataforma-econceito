import { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Form, Badge, Modal, Button, Row, Col, ListGroup } from 'react-bootstrap';

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

type ProdutoEncontrado = {
  id: number;
  descricao: string;
  codigo?: string;
  valor: number;
};

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
  const [editedPedido, setEditedPedido] = useState<PedidoDetalhado | null>(null);
  const [editingQuantities, setEditingQuantities] = useState<Record<number, string>>({});
  const [showUnsaveChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [editingDesconto, setEditingDesconto] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemSearchTerm, setNewItemSearchTerm] = useState("");
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [catalogoProdutos, setCatalogoProdutos] = useState<ProdutoEncontrado[]>([]);

  useEffect(() => {
    getPedidos();
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
        throw new Error('Formato de resposta inválido')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.mensagem || err.message || `Falha ao buscar detalhes do pedido ${pedidoId}.`;
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
  };

  const handleAttemptClose = () => {
    const hasUnsavedChanges = isOrderEditable && JSON.stringify(selectedPedidoDetalhes) !== JSON.stringify(editedPedido);

    if (hasUnsavedChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      handleCloseModal()
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
    const formattedValue = item.quantidade.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    setEditingQuantities(prev => ({
      ...prev,
      [item.id]: formattedValue,
    }));
  };

  const uptadedEditingQuantity = (itemId: number, value: string) => {
    setEditingQuantities(prev => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const commitQuantityChange = (itemId: number) => {
    if (!editedPedido) return;
  
    const rawValue = editingQuantities[itemId];
    if (rawValue === undefined || rawValue.trim()=== "") {
      const { [itemId]: _, ...rest } = editingQuantities;
      setEditingQuantities(rest);
      return;
    }

    const newQuantity = parseFloat(rawValue.replace(",", ".")) || 0;

    const updatedItens = editedPedido.itens.map(item => {
      if (item.id === itemId) {
        return{ ...item, quantidade: newQuantity };
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

    if (window.confirm("Tem certeza que deseja remover este item?")) {
      const updatedItens = editedPedido.itens.filter(
        (item) => item.id !== ItemIdToRemove
      );
      setEditedPedido({
        ...editedPedido,
        itens: updatedItens,
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!editedPedido) return;

    setLoadingDetalhes(true);

    try {
      const response = await api.put(`/api/pedidos/${editedPedido.id}`, editedPedido);
      console.log('Resposta do backend:', response.data);
      
      await getPedidos();

      alert("Alterações salvas com sucesso!");
      handleCloseModal(); 

    } catch (err: any) {
      const errorMessage = err.response?.data?.mensagem || "Falha ao salvar as alterações.";
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
        id: produto.id
      },
    };

    setEditedPedido({
      ...editedPedido,
      itens: [...editedPedido.itens, novoItem]
    });

    setIsAddingItem(false);
    setNewItemSearchTerm('');
  };

  const getPedidos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/api/pedidos');
      if (Array.isArray(res.data)) {
        setPedidos(res.data as PedidoDetalhado[]);
      } else {
        setError('Formato de dados de pedidos inesperado.');
        setPedidos([]);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.mensagem || err.message || 'Falha ao buscar dados dos pedidos.';
      setError(errorMessage);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  const searchResults = newItemSearchTerm.length < 2
    ? []
    : catalogoProdutos.filter(p => 
        p.descricao.toLowerCase().includes(newItemSearchTerm.toLowerCase()) ||
        (p.codigo && p.codigo.toLowerCase().includes(newItemSearchTerm.toLowerCase()))
    ).slice(0, 10);

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

  const isOrderEditable = selectedPedidoDetalhes?.situacao.id === 6;

  const totais = editedPedido ? {
    numeroDeItens: editedPedido.itens.length,
    somaDasQuantidades: editedPedido.itens.reduce((acc, item) => acc + item.quantidade, 0),
    subtotal: editedPedido.itens.reduce((acc, item) => acc + (item.valor * item.quantidade), 0),
    valorDoDesconto: function() {
      return editedPedido.desconto?.valor || 0;
    },
    totalDaVenda: function() {
      return this.subtotal - this.valorDoDesconto();
    }
  } : null;

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
        <Modal show={showDetalhesModal} onHide={handleAttemptClose} dialogClassName="modal-largo"  centered style={{ fontSize: "0.90rem" }}>
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
                <h5 style={{ fontWeight: 'bold'}}>
                  Dados do Pedido
                </h5>

                <Row className="mb-3">
                  <Col md={5}>
                    <Form.Group>
                      <Form.Label style={{ fontSize: '0.8rem' }}>Cliente</Form.Label>
                      <Form.Control
                        type="text"
                        name="contato.nome"
                        readOnly={!isOrderEditable}
                        disabled={!isOrderEditable}
                        value={editedPedido?.contato.nome || ""}
                        onChange={handleInputChange}
                        title={selectedPedidoDetalhes.contato.nome || ""}
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
                
                <h6 style={{ fontWeight: 'bold' }} className="mt-5">Itens do Pedido</h6>
                {editedPedido?.itens && editedPedido.itens.length > 0 ? (
                  <ListGroup variant="flush" className="mt-2" style={{ gap: '0rem' }}>

                {editedPedido.itens.map((item, index) => {
                  const editedItem = isOrderEditable ? editedPedido?.itens.find(i => i.id === item.id) : null;
                  const displayQuantity = editedItem ? editedItem.quantidade : item.quantidade;
                  const displayTotal = editedItem ? displayQuantity * editedItem.valor : item.quantidade * item.valor;

                  return (
                    <ListGroup.Item key={item.id} className="px-0" style={{ border: 0 }}>
                      <Row className="align-items-center g-2">
                        <Col xs="auto" className="d-flex align-items-center justify-content-center">
                          <div
                            style={{
                              backgroundColor: "#ced4da",
                              color: "white",
                              fontWeight: "bold",
                              width: "30px",
                              height: "30px",
                              borderRadius: "0.375rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            {index + 1}
                          </div>
                        </Col>

                        <Col>
                            <div style={{
                              border: "1px solid #dee2e6",
                              borderRadius: "0.5rem",
                              padding: "0.4rem"
                            }}>
                              <Row className="align-items-center h-100 d-flex">
                                <Col className="pe-3 flex-grow-1 border-end">
                                  <div>{item.descricao}</div>
                                </Col>

                                <Col xs={6} md={2} className="px-3" style={{ borderRight: '1px solid #dee2e6' }}>
                                  <span className="d-md-none fw-bold">Código </span>{item.codigo || item.produto.id}
                                </Col>

                                <Col xs={6} md={2} className="px-3" style={{ borderRight: '1px solid #dee2e6' }}>
                                  <span className="d-md-none fw-bold">Quantidade </span>
                                  {isOrderEditable ? (
                                    <Form.Control
                                    type="text"
                                    size="sm"
                                    value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : displayQuantity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    onFocus={(e) => {
                                      if (editedItem) {
                                        startEditingQuantity(editedItem);
                                      }
                                      setTimeout(() => e.target.select(), 0);
                                    }}
                                    onChange={(e) => uptadedEditingQuantity(item.id, e.target.value)}
                                    onBlur={() => commitQuantityChange(item.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        commitQuantityChange(item.id);
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      boxShadow: "none",
                                      textAlign: "left",
                                      width: "100%",
                                      minWidth: "70px",
                                      color: "inherit",
                                      fontSize: "0.90rem"
                                    }}
                                  />
                                ) : (
                                  displayQuantity.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  )}
                                </Col>

                                <Col xs={6} md={2} className="px-3" style={{ borderRight: '1px solid #dee2e6' }}>
                                  <span className="d-md-none fw-bold">Preço un </span>{item.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                </Col>

                                <Col xs={6} md={2} className="ps-3">
                                  <span className="d-md-none fw-bold">Preço total </span>
                                  {displayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </Col>
                              </Row>
                            </div>
                        </Col>

                        {/* Ícone de lixeira separado da lista */}
                        {isOrderEditable && (
                          <Col xs="auto" className="d-flex align-items-center">
                            <Button 
                              variant="outline-danger"
                              size="sm"
                              className="rounded-3 p-2"
                              onClick={() => handleRemoveItem(item.id)}
                              style={{ 
                                width: "36px", 
                                height: "36px", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                marginLeft: "8px"
                              }}
                            >
                              <i className="bi bi-trash" />
                            </Button>
                          </Col>
                        )}
                      </Row>
                    </ListGroup.Item>
                  )
                })}

                {isAddingItem && editedPedido && (
                  <ListGroup.Item className="px-0">
                    <Row className="align-items-center g-2">
                      <Col xs="auto" className="d-flex align-items-center justify-content-center">
                        <div
                          style={{
                            backgroundColor: "#ced4da",
                            color: "white",
                            fontWeight: "bold",
                            width: "30px",
                            height: "30px",
                            borderRadius: "0.375rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          {editedPedido.itens.length + 1}
                        </div>
                      </Col>

                      <Col>
                        <div style={{ border: "1px solid #dee2e6", borderRadius: "0.5rem", padding: "0.4rem" }}>
                          <Row className="align-items-center h-100 d-flex">
                            <Col xs={12} md={4} className="pe-3" style={{ borderRight: "1px solid #dee2e6" }}>
                              <Form.Control
                                type="text"
                                placeholder="Pesquise por código ou descrição"
                                className="border-0 shadow-none"
                                value={newItemSearchTerm}
                                onChange={(e) => setNewItemSearchTerm(e.target.value)}
                                autoFocus
                              />
                            </Col>
                            <Col xs={6} md={2} className="px-3" style={{ borderRight: "1px solid #dee2e6" }}>
                              ㅤㅤ
                            </Col>
                            <Col xs={6} md={2} className="px-3" style={{ borderRight: "1px solid #dee2e6" }}>
                              ㅤㅤ
                            </Col>
                            <Col xs={6} md={2} className="px-3" style={{ borderRight:"1px solid #dee2e6" }}>
                              R$ 0,00
                            </Col>
                            <Col xs={6} md={2} className="ps-3">
                              R$ 0,00
                            </Col>
                          </Row>

                          {isLoadingSearch && (
                            <div className="text-center p-2"><Spinner animation="border" size="sm" /></div>
                          )}

                          {searchResults.length > 0 && (
                            <ListGroup
                              style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                zIndex: 10,
                                maxHeight: "200px",
                                overflowY: "auto"
                              }}
                              className="shadow-sm"
                            >
                              {searchResults.map(produto => (
                                <ListGroup.Item
                                  key={produto.id}
                                  action
                                  onClick={() => handleProductSelect(produto)}
                                >
                                  {produto.descricao} <br/>
                                  <small className="text-muted"> Código: {produto.codigo || "N/A"} | Preço: {(produto.valor || 0).toLocaleString("pt-BR", {style: "currency", currency: "BRL"})}</small>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          )}
                        </div>
                      </Col>

                      <Col xs="auto" className="d-flex align-items-center">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="rounded-3 p-2"
                          onClick={() => setIsAddingItem(false)}
                          title="Cancelar adição"
                          style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "8px"}}
                        >
                          <i className="bi bi-trash" />
                        </Button>
                      </Col>
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
                    onClick={() => setIsAddingItem(true)}
                >
                    Adicionar item
                </Button>
            </div>
          )}

          <div className="mt-4">
            <h5 style={{ fontWeight: "bold" }}>Totais</h5>
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
                      value={totais.somaDasQuantidades.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small text-muted">Desconto (R$)</Form.Label>
                    <Form.Control
                      type="text"
                      readOnly={!isOrderEditable}
                      disabled={!isOrderEditable}
                      value={
                        editingDesconto !== null
                        ? editingDesconto
                        : (editedPedido?.desconto?.valor || 0)
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

                        const novoValor = parseFloat(editingDesconto.replace(",", ".")) || 0;

                        if (editedPedido) {
                          setEditedPedido({
                            ...editedPedido,
                            desconto: {
                              ...editedPedido.desconto,
                              unidade: editedPedido.desconto?.unidade || "%",
                              valor: novoValor,
                            }
                          });
                        }

                        setEditingDesconto(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small text-muted">Total da Venda</Form.Label>
                    <Form.Control
                      type="text"
                      readOnly
                      disabled
                      className="fw-bold"
                      value={totais.totalDaVenda().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    /> 
                  </Form.Group>
                </Col>
              </Row>
            )}
          </div>

            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {isOrderEditable ? (
            <>
              <Button
                variant="secondary"
                onClick={handleAttemptClose}
                style={{ width: "120px" }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveChanges}
                style={{ width: "120px" }}
              >
                Salvar
              </Button>
            </>
          ) : (
          <Button
            variant="secondary"
            onClick={handleCloseModal}
            style={{ width: "120px"}}
          >
            Fechar
          </Button>
          )}
        </Modal.Footer>
      </Modal>
      )}
      <Modal show={showUnsaveChangesModal} onHide={() => setShowUnsavedChangesModal(false)} centered>
        <Modal.Body className="text-center p-4">
          <h5 className="mb-3">Desaja salvar as alterações?</h5>
          <p className="text-muted">
            Suas edições serão perdidas se você não as salvar.
          </p>
        </Modal.Body>

        <Modal.Footer className="justify-content-center border-0 gap-2"
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
    </div>
  );
}