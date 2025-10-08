import { Badge } from 'react-bootstrap';
import { useDroppable } from '@dnd-kit/core';

import { KanbanCard } from './kanbancard';

type Pedido = {
  id: string | number;
  numero: string | number;
  data_pedido: string;
  cliente_nome: string;
  total: number;
  kanban_column: string;
  has_observation: boolean;
};

type KanbanColumn = {
  id: string;
  title: string;
  pedidos: Pedido[];
  color?: string;
  titleBgColor?: string;
  titleColor?: string;
  indicatorColor?: string;
};

interface KanbanColumnProps {
  column: KanbanColumn;
  titleSize?: number | string;
  titleColor?: string;
  onCardClick: (pedido: Pedido) => void;
}

export function KanbanColumn({
  column,
  titleSize = '0.95rem',
  titleColor = '#222',
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const fontSize = typeof titleSize === 'number' ? `${titleSize}px` : String(titleSize);

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '0 0 auto',
        width: '272px',
        padding: '8px',
        backgroundColor: column.color || '#f4f5f7',
        borderRadius: '5px',
      }}
    >
      <div
        style={{
          padding: '4px 8px',
          marginBottom: '8px',
          backgroundColor: column.titleBgColor || '#DFE1E6',
          color: column.titleColor || '#42526E',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span>{column.title}</span>
        <span>{column.pedidos.length}</span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: '150px',
        }}
      >
        {column.pedidos.map((pedido) => (
          <KanbanCard
            key={pedido.id}
            pedido={pedido}
            indicatorColor={column.indicatorColor}
            columnTitle={column.title}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}
