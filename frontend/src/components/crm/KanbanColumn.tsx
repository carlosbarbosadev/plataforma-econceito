import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Col, Badge, Dropdown } from 'react-bootstrap';

import KanbanCard from './KanbanCard';
import { Column, Deal, Label } from '../../types/crm';

interface KanbanColumnProps {
  column: Column;
  onRename: (col: Column) => void;
  onDelete: (col: Column) => void;
  onCardClick: (deal: Deal) => void;
  labels: Label[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, onRename, onDelete, onCardClick, labels }) => (
  <Col style={{ minWidth: '300px', maxWidth: '300px' }}>
    <Droppable droppableId={column.title}>
      {(provided, snapshot) => (
        <>
          <div
            className={`p-3 rounded-top d-flex align-items-center justify-content-between column-header${snapshot.isDraggingOver ? ' kanban-col-hover' : ''
              }`}
            style={{
              backgroundColor: snapshot.isDraggingOver ? '#eaeaee' : '#f5f5f6',
              color: '#424242',
              transition: 'background-color 0.2s',
            }}
          >
            <div className="d-flex align-items-center">
              <strong>{column.title}</strong>
              <Badge
                className="ms-2"
                style={{
                  background: 'linear-gradient(135deg, #3498db, #2ecc71)',
                  borderRadius: '4px',
                }}
              >
                {column.deals.length}
              </Badge>
            </div>

            <Dropdown className="d-flex align-items-center column-options">
              <Dropdown.Toggle as="span" style={{ cursor: 'pointer', display: 'flex' }}>
                <img src="/assets/icons/glass/more-vertical.svg" width="22" alt="Options" />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => onRename(column)}>Renomear</Dropdown.Item>
                <Dropdown.Item onClick={() => onDelete(column)} className="text-danger">
                  Excluir
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>

          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-2 rounded-bottom${snapshot.isDraggingOver ? ' kanban-col-hover' : ''}`}
            style={{
              backgroundColor: snapshot.isDraggingOver ? '#eaeaee' : '#f5f5f6',
              minHeight: '500px',
              transition: 'background-color 0.2s ease',
            }}
          >
            {column.deals.map((deal, index) => (
              <KanbanCard
                key={deal.deal_id ?? deal.client_id}
                deal={deal}
                index={index}
                onClick={onCardClick}
                labels={labels}
              />
            ))}
            {provided.placeholder}
          </div>
        </>
      )}
    </Droppable>
  </Col>
);

export default React.memo(KanbanColumn);
