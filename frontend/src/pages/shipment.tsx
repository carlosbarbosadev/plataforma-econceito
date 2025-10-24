import { useState, useEffect, useMemo, useRef } from 'react';
import { Container, Spinner, Alert, Form, Button } from 'react-bootstrap';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';

import api from 'src/services/api';

import { KanbanCard } from './kanbancard';
import { PedidoDetalhesModal } from './pedidodetalhesmodal';
import { ProductionReportModal } from './productionreportmodal';
import { StockDemandReportModal } from './stockdemandreportmodal';
import { KanbanColumn as KanbanColumnComponent } from './kanbancolumn';

type Pedido = {
  id: string | number;
  numero: string | number;
  data_pedido: string;
  cliente_nome: string;
  total: number;
  vendedor_nome?: string;
  kanban_column: 'em-aberto' | 'em-separação' | 'pronto-para-envio' | string;
  has_observation: boolean;
  acknowledged: boolean;
  isFullyInStock: boolean;
  outOfStockCount: number;
};

type KanbanColumn = {
  id: 'em-aberto' | 'em-separacao' | 'pronto-para-envio' | string;
  title: string;
  pedidos: Pedido[];
  color?: string;
  titleBgColor?: string;
  titleColor?: string;
  indicatorColor?: string;
};

type Columns = {
  [key: string]: KanbanColumn;
};

function normalize(s?: string | number) {
  const str = String(s ?? '');
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export default function ShipmentPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCardId, setActiveCardId] = useState<UniqueIdentifier | null>(null);
  const [modalShow, setModalShow] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showProductionReportModal, setShowProductionReportModal] = useState(false);
  const [showStockReportModal, setShowStockReportModal] = useState(false);

  const scrollToTop = () => {
    scrollableContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await api.get<Pedido[]>('/api/expedicao/pedidos-para-envio');
        setPedidos(Array.isArray(response.data) ? response.data : []);
      } catch (err: any) {
        console.error('Erro ao buscar dados do quadro:', err);
        setError('Não foi possível carregar o quadro de expedição.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollableContainerRef.current;

    if (!container) {
      return;
    }

    const toggleVisibility = () => {
      if (container.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    container?.addEventListener('scroll', toggleVisibility);

    // eslint-disable-next-line consistent-return
    return () => container?.removeEventListener('scroll', toggleVisibility);
  }, [loading]);

  const q = useMemo(() => normalize(searchTerm), [searchTerm]);

  const pedidosFiltrados = useMemo(() => {
    if (!q) return pedidos;
    return pedidos.filter((p) => {
      const byCliente = normalize(p.cliente_nome).includes(q);
      const byNumero = normalize(p.numero).includes(q);
      const byVendedor = normalize(p.vendedor_nome).includes(q);
      return byCliente || byNumero || byVendedor;
    });
  }, [pedidos, q]);

  const pedidosOrdenados = useMemo(
    () =>
      [...pedidosFiltrados].sort((a, b) => {
        if (a.isFullyInStock !== b.isFullyInStock) {
          return Number(b.isFullyInStock) - Number(a.isFullyInStock);
        }

        if (a.acknowledged !== b.acknowledged) {
          return Number(a.acknowledged) - Number(b.acknowledged);
        }

        return 0;
      }),
    [pedidosFiltrados]
  );

  const columns: Columns = useMemo(() => {
    const base: Columns = {
      'em-aberto': {
        id: 'em-aberto',
        title: 'EM ABERTO',
        pedidos: [],
        color: '#f3f3f5',
        titleBgColor: '',
        titleColor: '',
        indicatorColor: '#6B778C',
      },
      natal: {
        id: 'natal',
        title: 'NATAL',
        pedidos: [],
        color: '#f7e8e8ff',
        titleBgColor: '#c75e68',
        titleColor: '#ffffff',
        indicatorColor: '#c75e68',
      },
      'em-producao': {
        id: 'em-producao',
        title: 'AGUARDANDO PRODUÇÃO',
        pedidos: [],
        color: '#fff3e0',
        titleBgColor: '#f8ae00',
        titleColor: '#48412f',
        indicatorColor: '#f8ae00',
      },
      'em-separacao': {
        id: 'em-separacao',
        title: 'EM SEPARAÇÃO',
        pedidos: [],
        color: '#fff3e0',
        titleBgColor: '#f8ae00',
        titleColor: '#48412f',
        indicatorColor: '#f8ae00',
      },
      verificado: {
        id: 'verificado',
        title: 'VERIFICADO',
        pedidos: [],
        color: '#eee9fcff',
        titleBgColor: '#6317f8',
        titleColor: '#ffffff',
        indicatorColor: '#6317f8',
      },
      'pronto-para-envio': {
        id: 'pronto-para-envio',
        title: 'ATENDIDO',
        pedidos: [],
        color: '#ebf7f4ff',
        titleBgColor: '#488a6f',
        titleColor: '#ffffff',
        indicatorColor: '#488a6f',
      },
    };

    for (const pedido of pedidosOrdenados) {
      const col = pedido.kanban_column;
      if (!base[col]) {
        base[col] = { id: col, title: col, pedidos: [] };
      }
      base[col].pedidos.push(pedido);
    }
    return base;
  }, [pedidosOrdenados]);

  function handleShowModal(pedido: Pedido) {
    setSelectedPedido(pedido);
    setModalShow(true);
  }

  function handlePedidoAtualizado(pedidoId: string | number, novaColuna: string) {
    setPedidos((prevPedidos) =>
      prevPedidos.map((p) =>
        String(p.id) === String(pedidoId) ? { ...p, kanban_column: novaColuna } : p
      )
    );
  }

  function handleCloseModal() {
    setModalShow(false);
    setSelectedPedido(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCardId(null);
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const newColumnId = String(over.id);

    setPedidos((prev) => {
      const idx = prev.findIndex((p) => String(p.id) === String(activeId));
      if (idx === -1) return prev;

      if (prev[idx].kanban_column === newColumnId) return prev;

      const next = [...prev];
      next[idx] = { ...next[idx], kanban_column: newColumnId };
      return next;
    });

    api
      .put(`/api/expedicao/status/${activeId}`, { newColumn: newColumnId })
      .then(() => {
        console.log(`SUCESSO: Pedido ${activeId} salvo na coluna ${newColumnId}.`);
      })
      .catch((err) => {
        console.error('ERRO: Falha ao salvar a nova posição do card:', err);
        alert('Não foi possível salvar a alteração. O card retornará à sua posição original.');
        api
          .get<Pedido[]>('/api/expedicao/pedidos-para-envio')
          .then((r) => setPedidos(Array.isArray(r.data) ? r.data : []))
          .catch(() => {});
      });
  }

  const handlePedidoAcknowledged = (pedidoId: string | number) => {
    setPedidos((prevPedidos) =>
      prevPedidos.map((p) => (p.id === pedidoId ? { ...p, acknowledged: true } : p))
    );
  };

  if (loading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando expedição...</span>
        </Spinner>
      </Container>
    );
  }

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const activeCard = activeCardId ? pedidos.find((p) => p.id === activeCardId) : null;
  const activeColumn = activeCard ? columns[activeCard.kanban_column] : null;

  return (
    <Container fluid className="mt-4 d-flex flex-column" style={{ height: 'calc(100vh - 100px)' }}>
      <h3 className=" mt-3 mb-4 fw-bold">Quadro de Expedição</h3>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <Form.Group style={{ width: '100%', maxWidth: '500px' }}>
          <Form.Control
            className="input-foco-azul"
            type="text"
            placeholder="Pesquisar por nome, vendedor ou nº do pedido"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ borderRadius: '5px' }}
          />
        </Form.Group>

        <div className="d-flex gap-2">
          <Button onClick={() => setShowReportModal(true)} className="relatorio-button">
            Relatório produção
          </Button>

          <Button onClick={() => setShowStockReportModal(true)} className="relatorio-button">
            Relatório estoque
          </Button>
        </div>
      </div>

      <div
        ref={scrollableContainerRef}
        style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}
      >
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              height: '100%',
              alignItems: 'flex-start',
            }}
          >
            {Object.values(columns).map((column) => (
              <KanbanColumnComponent
                key={column.id}
                column={column}
                titleSize="14px"
                titleColor="#6b6e76"
                onCardClick={handleShowModal}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard && activeColumn ? (
              <KanbanCard
                pedido={activeCard}
                isOverlay
                columnTitle={activeColumn.title}
                indicatorColor={activeColumn.indicatorColor}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      <PedidoDetalhesModal
        show={modalShow}
        onHide={handleCloseModal}
        pedido={selectedPedido}
        columns={Object.values(columns)}
        onPedidoUpdate={handlePedidoAtualizado}
        unmountOnExit={false}
        onAcknowledged={handlePedidoAcknowledged}
      />

      <Button
        onClick={scrollToTop}
        className={`scroll-to-top-btn ${isVisible ? 'visible' : ''}`}
        aria-label="Voltar ao topo"
      >
        &uarr;
      </Button>

      <ProductionReportModal show={showReportModal} onHide={() => setShowReportModal(false)} />

      <StockDemandReportModal
        show={showStockReportModal}
        onHide={() => setShowStockReportModal(false)}
      />
    </Container>
  );
}
