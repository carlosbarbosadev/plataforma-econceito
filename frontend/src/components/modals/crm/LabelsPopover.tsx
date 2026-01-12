import { Overlay, Popover, Form } from 'react-bootstrap';

import { LABELS } from '../../../types/crm';

interface LabelsPopoverProps {
  show: boolean;
  target: HTMLElement | null;
  onHide: () => void;
  selected: string[];
  onSelect: (label: string) => void;
}

export default function LabelsPopover({
  show,
  target,
  onHide,
  selected,
  onSelect,
}: LabelsPopoverProps) {
  return (
    <Overlay
      show={show}
      target={target}
      placement="bottom-start"
      containerPadding={0}
      rootClose
      onHide={onHide}
    >
      <Popover
        id="labels-popover"
        style={{ minWidth: 300, boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: '1rem',
            fontWeight: 600,
            padding: '12px 0 4px 0',
            color: '#505258',
          }}
        >
          Etiquetas
        </div>
        <Popover.Body>
          <Form>
            {LABELS.map((label) => (
              <div
                key={label.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(label.name)}
                  onChange={() => onSelect(label.name)}
                  style={{
                    marginRight: 12,
                    width: 15,
                    height: 15,
                    cursor: 'pointer',
                    borderRadius: 1,
                  }}
                />
                <div
                  style={{
                    width: 209,
                    height: 32,
                    background: label.color,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 10,
                  }}
                >
                  <span
                    style={{
                      color: label.textColor,
                      fontWeight: 500,
                      fontSize: '0.9rem',
                    }}
                  >
                    {label.name}
                  </span>
                </div>
              </div>
            ))}
          </Form>
        </Popover.Body>
      </Popover>
    </Overlay>
  );
}
