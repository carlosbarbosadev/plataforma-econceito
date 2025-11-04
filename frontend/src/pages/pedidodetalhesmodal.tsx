import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Button,
  Row,
  Col,
  Spinner,
  Alert,
  Dropdown,
  DropdownToggle,
  Form,
  Badge,
} from 'react-bootstrap';

import api from 'src/services/api';

import { useDebounce } from '../hooks/useDebounce';

type Item = {
  id: string | number;
  produto: { id: string | number };
  descricao: string;
  quantidade: number;
  valor: number;
  codigo: string;
  isForProduction?: boolean;
  estoqueDisponivel?: number;
};

type PedidoDetalhes = {
  id: string | number;
  numero: string | number;
  data: string;
  contato: {
    nome: string;
  };
  vendedor: {
    nome: string;
  };
  total: number;
  itens: Item[];
  kanban_column: string;
  observacoes_expedicao: string;
  acknowledged: boolean;
};

type PedidoResumido = {
  id: string | number;
  numero: string | number;
};

type KanbanColumn = {
  id: string;
  title: string;
  titleBgColor?: string;
  titleColor?: string;
};

interface PedidoDetalhesModalProps {
  show: boolean;
  onHide: () => void;
  pedido: PedidoResumido | null;
  columns: KanbanColumn[];
  onPedidoUpdate: (pedidoId: string | number, novaColuna: string) => void;
  unmountOnExit?: boolean;
  onAcknowledged: (pedidoId: string | number) => void;
}

export function PedidoDetalhesModal({
  show,
  onHide,
  pedido,
  columns,
  onPedidoUpdate,
  unmountOnExit,
  onAcknowledged,
}: PedidoDetalhesModalProps) {
  const [detalhes, setDetalhes] = useState<PedidoDetalhes | null>(null);
  const [editedObservacoes, setEditedObservacoes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editedItems, setEditedItems] = useState<Item[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [isSearching, setIsSearching] = useState(false);
  const quantityInputsRef = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  useEffect(() => {
    if (debouncedSearchTerm.trim().length >= 2) {
      handleSearchProducts(debouncedSearchTerm);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchTerm]);

  const handleSearchProducts = async (termToSearch: string) => {
    setIsSearching(true);
    try {
      const response = await api.get('/api/produtos/search', { params: { search: termToSearch } });
      setSearchResults(response.data);
    } catch {
      console.error('Erro na busca de produtos:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddItem = (product: any) => {
    const itemExists = editedItems.some((item) => item.codigo === product.codigo);
    if (itemExists) {
      alert('Este produto já está no pedido');
      return;
    }

    const newItem: Item = {
      id: Date.now() * -1,
      produto: { id: product.id },
      codigo: product.codigo,
      descricao: product.nome,
      quantidade: 1,
      valor: parseFloat(product.preco) || 0,
      isForProduction: false,
      estoqueDisponivel: parseFloat(product.estoque) || 0,
    };

    setEditedItems((prevItems) => [...prevItems, newItem]);

    setTimeout(() => {
      quantityInputsRef.current[newItem.id]?.focus();
      quantityInputsRef.current[newItem.id]?.select();
    }, 0);

    setSearchTerm('');
    setSearchResults([]);
    setQuantityToAdd(1);
  };

  const handleSaveChanges = async () => {
    if (!detalhes || !pedido) return;
    setIsSaving(true);

    const payload = {
      ...detalhes,
      itens: editedItems,
    };

    try {
      await api.put(`/api/pedidos/${pedido.id}`, payload);
      console.log('Alterações nos itens salvas com sucesso!');
      onHide();
      window.location.reload();
    } catch (err) {
      console.error('Falha ao salvar alterações do pedido:', err);
      alert('Ocorreu um erro ao salvar as alterações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemSelection = (itemCode: string, quantity: number, isSelected: boolean) => {
    setSelectedItems((prevSelected) => {
      const updatedSelection = new Set(prevSelected);
      if (isSelected) {
        updatedSelection.add(itemCode);
      } else {
        updatedSelection.delete(itemCode);
      }
      return updatedSelection;
    });

    api
      .post('/api/expedicao/production-item', {
        orderId: pedido?.id,
        productCode: itemCode,
        quantity: quantity,
        isSelected: isSelected,
      })
      .then(() => console.log(`Item ${itemCode} atualizado com sucesso.`))
      .catch((err) => {
        console.error('Falha ao salvar seleção do item:', err);
        alert('Ocorreu um erro ao salvar a seleção deste item.');
        setSelectedItems((prevSelected) => {
          const updatedSelection = new Set(prevSelected);
          if (updatedSelection.has(itemCode)) {
            updatedSelection.delete(itemCode);
          } else {
            updatedSelection.add(itemCode);
          }
          return updatedSelection;
        });
      });
  };

  const handleAcknowledge = async () => {
    if (!pedido) return;
    setIsAcknowledging(true);
    try {
      await api.post(`/api/expedicao/acknowledge/${pedido.id}`);

      onAcknowledged(pedido.id);

      setDetalhes((prevDetalhes) =>
        prevDetalhes ? { ...prevDetalhes, acknowledged: true } : null
      );
    } catch (err) {
      console.error('Erro ao marcar pedido com visto:', err);
      alert('Não foi possível marcar o pedido como visto.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  useEffect(() => {
    if (pedido && show) {
      const fetchDetalhes = async () => {
        setIsLoading(true);
        setError(null);
        setDetalhes(null);

        try {
          const response = await api.get(`/api/pedidos/${pedido.id}`);
          setDetalhes(response.data);
          setEditedItems(response.data.itens || []);
          setEditedObservacoes(response.data.observacoes_expedicao || '');

          const initialSelected = new Set<string>();
          if (response.data.itens) {
            response.data.itens.forEach((item: Item) => {
              if (item.isForProduction) {
                initialSelected.add(item.codigo);
              }
            });
          }
          setSelectedItems(initialSelected);
        } catch (err) {
          console.error('Erro ao buscar detalhes do pedido', err);
          setError('Não foi possível carregar os detalhes do pedido.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetalhes();
    }
  }, [pedido, show]);

  const handleColumnChange = async (novaColunaId: string) => {
    if (!pedido || !detalhes || isUpdating || detalhes.kanban_column === novaColunaId) {
      return;
    }

    setIsUpdating(true);
    try {
      await api.put(`/api/expedicao/status/${pedido.id}`, { newColumn: novaColunaId });
      onPedidoUpdate(pedido.id, novaColunaId);
      setDetalhes((prevDetalhes) =>
        prevDetalhes ? { ...prevDetalhes, kanban_column: novaColunaId } : null
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Não foi possível atualizar o status do pedido.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveObservacoes = async () => {
    if (!detalhes || !pedido || editedObservacoes === detalhes.observacoes_expedicao) {
      return;
    }

    try {
      await api.put(`/api/expedicao/status/${pedido.id}`, {
        observacoes: editedObservacoes,
      });

      setDetalhes((prev) => (prev ? { ...prev, observacoes_expeficao: editedObservacoes } : null));
      console.log('Observações salvas com sucesso!');
    } catch (err) {
      console.error('Falha ao salvar observações:', err);
      alert('Não foi possível salvar as observações.');
      setEditedObservacoes(detalhes.observacoes_expedicao);
    }
  };

  const handleRemoveItem = (itemIdToRemove: string | number) => {
    setEditedItems((prevItems) => prevItems.filter((item) => item.id !== itemIdToRemove));
  };

  const handleQuantityChange = (itemIdToChange: string | number, valueAsString: string) => {
    const quantity = parseInt(valueAsString, 10);

    setEditedItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemIdToChange
          ? { ...item, quantidade: isNaN(quantity) && valueAsString === '' ? NaN : quantity }
          : item
      )
    );
  };

  const handleQuantityBlur = (itemIdToChange: string | number) => {
    setEditedItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemIdToChange) {
          const finalQuantity =
            isNaN(item.quantidade) || item.quantidade <= 0 ? 1 : item.quantidade;
          return { ...item, quantidade: finalQuantity };
        }
        return item;
      })
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-5">
          <Spinner animation="border" />
        </div>
      );
    }
    if (error) {
      return <Alert variant="danger">{error}</Alert>;
    }
    if (!detalhes) {
      return null;
    }

    const isForProductionColumn = detalhes.kanban_column === 'em-producao';

    console.log('ID da coluna vindo da API:', detalhes.kanban_column);
    console.log('Array de colunas vindo das props:', columns);

    const colunaAtual = columns.find((c) => c.id === detalhes.kanban_column);
    console.log('Resultado do .find():', colunaAtual);

    return (
      <>
        <div className="mb-4 d-flex align-items-center">
          <Dropdown>
            <Dropdown.Toggle
              variant="light"
              id="dropdown-status"
              disabled={isUpdating}
              className="fw-bold"
              style={{
                backgroundColor: colunaAtual?.titleBgColor || '#6c757d',
                color: colunaAtual?.titleColor || '#ffffff',
                border: 'none',
                borderRadius: '3px',
                marginRight: '10px',
                padding: '0.2rem 1rem',
                fontSize: '0.9rem',
                lineHeight: '1.5',
              }}
            >
              {isUpdating ? 'Atualizando' : colunaAtual?.title || detalhes.kanban_column}
            </Dropdown.Toggle>

            <Dropdown.Menu className="status-dropdown-menu">
              {columns
                .filter((coluna) => coluna.id !== detalhes.kanban_column)
                .map((coluna) => (
                  <Dropdown.Item key={coluna.id} onClick={() => handleColumnChange(coluna.id)}>
                    {coluna.title}
                  </Dropdown.Item>
                ))}
            </Dropdown.Menu>
          </Dropdown>
          {!detalhes.acknowledged && (
            <Button
              className="fw-bold"
              onClick={handleAcknowledge}
              disabled={isAcknowledging}
              style={{
                backgroundColor: '#439746',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '0.2rem 1rem',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                width: '120px',
              }}
            >
              {isAcknowledging ? <Spinner animation="border" size="sm" /> : 'CONFIRMAR'}
            </Button>
          )}
        </div>
        <Row className="mb-4">
          {' '}
          <Col md={4}>
            <div className="info-block">
              <small>Cliente</small>
              <p>{detalhes.contato.nome}</p>
            </div>
          </Col>
          <Col md={4}>
            <div className="info-block">
              <small>Data do pedido</small>
              <p>{new Date(detalhes.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
          </Col>
          <Col md={4}>
            <div className="info-block">
              <small>Valor total</small>
              <p>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  detalhes.total
                )}
              </p>
            </div>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <div className="info-block mb-2">
              <small>Produtos</small>
            </div>
            {detalhes.itens && detalhes.itens.length > 0 ? (
              <Row className="g-3">
                {editedItems.map((item, index) => {
                  const estoqueDisponivel = item.estoqueDisponivel ?? 0;
                  const isOutOfStock = item.quantidade > estoqueDisponivel;

                  return (
                    <Col md={6} key={item.id}>
                      <div
                        className={`product-card ${isOutOfStock ? 'border border-danger' : ''}`}
                        style={{
                          backgroundColor: isOutOfStock ? '#fff0f1' : '#fffff',
                          position: 'relative',
                          padding: '1rem',
                          borderRadius: '0.25rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <small>Descrição</small>
                            <p>{item.descricao}</p>
                          </div>
                          {isForProductionColumn && (
                            <Form.Check
                              type="checkbox"
                              id={`item-${item.id}`}
                              checked={selectedItems.has(item.codigo)}
                              onChange={(e) =>
                                handleItemSelection(item.codigo, item.quantidade, e.target.checked)
                              }
                              style={{
                                minWidth: '20px',
                                position: 'relative',
                                left: '6px',
                              }}
                              className="custom-checkbox-producao"
                            />
                          )}
                        </div>

                        <Row className="mt-3 align">
                          <Col xs={4}>
                            <small>Código</small>
                            <p>{item.codigo}</p>
                          </Col>
                          <Col xs={4}>
                            <small>Qtd.</small>
                            <Form.Control
                              type="number"
                              className="input-foco-azul"
                              size="sm"
                              value={isNaN(item.quantidade) ? '' : item.quantidade}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              onBlur={() => handleQuantityBlur(item.id)}
                              style={{ maxWidth: '50px', borderRadius: '4px' }}
                              ref={(el) => {
                                quantityInputsRef.current[item.id] = el;
                              }}
                            />
                          </Col>
                        </Row>

                        <div
                          style={{
                            marginLeft: '10px',
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-0 d-flex justify-content-center align-items-center"
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '2px',
                              color: 'white',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              border: 'none',
                              position: 'relative',
                            }}
                            title="Remover item"
                          >
                            X
                          </Button>

                          <Badge
                            bg="secondary"
                            className="product-number-badge"
                            style={{
                              marginTop: '19.9px',
                              marginLeft: '15px',
                              height: '24px',
                              minWidth: '24px',
                              padding: '0 0.6em',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '2px',
                              fontSize: '0.8rem',
                              position: 'relative',
                            }}
                          >
                            {index + 1}
                          </Badge>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <p className="text-muted">Nenhum item encontrado.</p>
            )}
          </Col>
        </Row>

        <Row className="mb-5 align-items-end g-2">
          <Col md={7} style={{ position: 'relative' }}>
            <Form.Group>
              <Form.Label style={{ fontWeight: 800, color: '#439746' }}>
                <small>Adicionar produto</small>
              </Form.Label>
              <Form.Control
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchProducts(searchTerm);
                }}
                placeholder="Pesquisar por código ou descrição"
                className="input-foco-azul form-style"
              />
            </Form.Group>

            {searchResults.length > 0 && searchTerm.trim().length >= 2 && (
              <div
                className="list-group"
                style={{
                  position: 'absolute',
                  zIndex: 1050,
                  width: '100%',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  borderRadius: '0.25rem',
                  backgroundColor: 'white',
                  boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                  marginTop: '2px',
                }}
              >
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2 px-3"
                    onClick={() => handleAddItem(product)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '0.9rem' }}>
                      <span className="fw-bold">{product.codigo}</span> - {product.nome}
                      <small className="text-muted d-block">
                        R$ {(parseFloat(product.preco) || 0).toFixed(2)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Col>
        </Row>

        <Row className="mb-4">
          <Col>
            <Form.Group>
              <Form.Label className="info-block mb-2">
                <small>Observações da expedição</small>
              </Form.Label>
              <Form.Control
                style={{ fontSize: '0.9rem', borderRadius: '4px' }}
                className="input-foco-azul"
                as="textarea"
                rows={4}
                placeholder="Nenhuma observação para a expedição"
                value={editedObservacoes}
                onChange={(e) => setEditedObservacoes(e.target.value)}
                onBlur={handleSaveObservacoes}
              />
            </Form.Group>
          </Col>
        </Row>
      </>
    );
  };
  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      dialogClassName="meu-modal-custom"
      unmountOnExit={unmountOnExit}
    >
      <Modal.Header closeButton>
        <Modal.Title>Detalhes do Pedido {pedido?.numero || pedido?.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{renderContent()}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSaving} className="cancel-button">
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="save-button"
        >
          {isSaving ? <Spinner animation="border" size="sm" /> : 'Salvar'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
