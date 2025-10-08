import { Card } from 'react-bootstrap';
import { CSS } from '@dnd-kit/utilities';
import { useDraggable } from '@dnd-kit/core';

type Pedido = {
  id: string | number;
  numero: string | number;
  data_pedido: string;
  cliente_nome: string;
  total: number;
  kanban_column: string;
  vendedor_nome?: string;
  has_observation: boolean;
};

interface KanbanCardProps {
  pedido: Pedido;
  indicatorColor?: string;
  columnTitle?: string;
  isOverlay?: boolean;
  onCardClick?: (pedido: Pedido) => void;
}

function formatStatusText(status: string) {
  return status.replace(/-/g, '').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function KanbanCard({
  pedido,
  indicatorColor,
  columnTitle,
  isOverlay,
  onCardClick,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: pedido.id,
  });

  const style = {
    padding: '1px',
    margin: '5px 0',
    borderRadius: '5px',
    touchAction: 'none',
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onCardClick && onCardClick(pedido)}
    >
      <Card className="kanban-card" style={{ minHeight: '100px', opacity: isOverlay ? 0.7 : 1 }}>
        <Card.Header
          style={{ backgroundColor: '#fff' }}
          as="div"
          className="d-flex justify-content-between align-items-center py-2 px-3 border-0"
        >
          <strong style={{ fontSize: '0.9rem' }}>Pedido {pedido.numero}</strong>
          <small className="text-muted">{pedido.data_pedido}</small>
        </Card.Header>
        <Card.Body className="py-2 px-3">
          <Card.Title style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
            {pedido.cliente_nome}
          </Card.Title>
          <div
            className="gap-1"
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
            }}
          >
            <span
              style={{
                height: '14px',
                width: '14px',
                backgroundColor: indicatorColor || '#6B778C',
                borderRadius: '50%',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#5E6C84' }}>
              {columnTitle}
            </span>
          </div>

          {pedido.has_observation && (
            <div className="mb-1" title="Este pedido possui observações">
              <img
                src="/assets/icons/glass/observation-icon.svg"
                alt="Possui observação"
                style={{ width: '16px', height: '16px' }}
              />
            </div>
          )}

          <div className="d-flex align-items-center gap-1">
            <small className="text-muted" style={{ fontSize: '0.8rem' }}>
              {pedido.vendedor_nome || '-'}
            </small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
