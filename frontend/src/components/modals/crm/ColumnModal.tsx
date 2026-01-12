import { Modal, Button, Form, Spinner } from 'react-bootstrap';

interface ColumnModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (e: React.FormEvent) => void;
  columnFormData: { title: string };
  setColumnFormData: (data: { title: string }) => void;
  saving: boolean;
  editingColumn: boolean;
}

export default function ColumnModal({
  show,
  onHide,
  onSubmit,
  columnFormData,
  setColumnFormData,
  saving,
  editingColumn,
}: ColumnModalProps) {
  return (
    <Modal show={show} onHide={onHide} dialogClassName="meu-modal-custom4" centered>
      <Modal.Header closeButton>
        <Modal.Title>{editingColumn ? 'Edit Column' : 'Criar coluna'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={onSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: '0.8rem' }} className="text-muted">
              Nome
            </Form.Label>
            <Form.Control
              className="input-foco-azul"
              type="text"
              value={columnFormData.title}
              onChange={(e) => setColumnFormData({ ...columnFormData, title: e.target.value })}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button className="cancel-button" onClick={onHide}>
            Cancelar
          </Button>
          <Button className="save-button" type="submit" disabled={saving}>
            {saving ? <Spinner animation="border" size="sm" /> : 'Salvar'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
