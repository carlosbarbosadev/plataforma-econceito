import { useState, useEffect } from 'react';
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

type Item = {
  id: string | number;
  descricao: string;
  quantidade: number;
  valor: number;
  codigo: string;
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
}

export function PedidoDetalhesModal({
  show,
  onHide,
  pedido,
  columns,
  onPedidoUpdate,
  unmountOnExit,
}: PedidoDetalhesModalProps) {
  const [detalhes, setDetalhes] = useState<PedidoDetalhes | null>(null);
  const [editedObservacoes, setEditedObservacoes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (pedido && show) {
      const fetchDetalhes = async () => {
        setIsLoading(true);
        setError(null);
        setDetalhes(null);
        try {
          const response = await api.get(`/api/pedidos/${pedido.id}`);
          setDetalhes(response.data);
          setEditedObservacoes(response.data.observacoes_expedicao || '');
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
              size="sm"
              className="fw-bold"
              style={{
                backgroundColor: colunaAtual?.titleBgColor || '#6c757d',
                color: colunaAtual?.titleColor || '#ffffff',
                border: 'none',
                borderRadius: '3px',
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
              <small>Data do Pedido</small>
              <p>{new Date(detalhes.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
          </Col>
          <Col md={4}>
            <div className="info-block">
              <small>Valor Total</small>
              <p>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  detalhes.total
                )}
              </p>
            </div>
          </Col>
        </Row>

        <Row className="mb-5">
          <Col>
            <div className="info-block mb-2">
              <small>Produtos</small>
            </div>
            {detalhes.itens && detalhes.itens.length > 0 ? (
              <Row className="g-3">
                {detalhes.itens.map((item, index) => (
                  <Col md={6} key={item.id}>
                    <div className="product-card">
                      <div>
                        <small>Descrição</small>
                        <p>{item.descricao}</p>
                      </div>
                      <Row className="mt-3">
                        <Col xs={4}>
                          <small>Código</small>
                          <p>{item.codigo}</p>
                        </Col>
                        <Col xs={4}>
                          <small>Qtd.</small>
                          <p>{item.quantidade}</p>
                        </Col>
                      </Row>

                      <Badge
                        bg="secondary"
                        className="product-number-badge"
                        style={{ borderRadius: '2px' }}
                      >
                        {index + 1}
                      </Badge>
                    </div>
                  </Col>
                ))}
              </Row>
            ) : (
              <p className="text-muted">Nenhum item encontrado.</p>
            )}
          </Col>
        </Row>

        <Row className="mb-4">
          <Col>
            <Form.Group>
              <Form.Label className="info-block mb-2">
                <small>Observações da Expedição</small>
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
    </Modal>
  );
}
