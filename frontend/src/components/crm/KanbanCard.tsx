import React from 'react';
import { Card } from 'react-bootstrap';
import { Draggable } from '@hello-pangea/dnd';

import { Deal, LABELS } from '../../types/crm';

interface KanbanCardProps {
  deal: Deal;
  index: number;
  onClick: (deal: Deal) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ deal, index, onClick }) => {
  const draggableId = String(deal.deal_id ?? deal.client_id);

  const attachmentsCount = Number(deal.total_attachments || 0);
  const commentsCount = Number(deal.total_comments || 0);

  const showFooter = attachmentsCount > 0 || commentsCount > 0;

  return (
    <Draggable draggableId={draggableId} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-2"
          onClick={() => onClick(deal)}
          style={{
            ...provided.draggableProps.style,
            cursor: 'pointer',
            boxShadow: snapshot.isDragging
              ? '0 5px 15px rgba(0,0,0,0.25)'
              : '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <Card.Body className="p-3">
            <Card.Title className="mb-0" style={{ fontSize: '0.95rem', color: '#44454b' }}>
              {deal.client_name}
            </Card.Title>

            {deal.labels && deal.labels.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
                {deal.labels.map((label) => {
                  const labelData = LABELS.find((l) => l.name === label);
                  const bg = labelData?.color || '#e0e0e0';
                  const text = labelData?.textColor || '#505258';
                  return (
                    <span
                      key={label}
                      style={{
                        backgroundColor: bg,
                        color: text,
                        borderRadius: 4,
                        padding: '0 8px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            )}

            {showFooter && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 12,
                  color: '#505258',
                }}
              >
                {commentsCount > 0 && (
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Comentários"
                  >
                    <img
                      src="/assets/icons/glass/observation2.svg"
                      alt="Anexar"
                      width={14}
                      height={14}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{commentsCount}</span>
                  </div>
                )}

                {attachmentsCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="Anexos">
                    <img src="/assets/icons/glass/paperclip.svg" width={15} height={15} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{attachmentsCount}</span>
                  </div>
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </Draggable>
  );
};

export default React.memo(KanbanCard);
