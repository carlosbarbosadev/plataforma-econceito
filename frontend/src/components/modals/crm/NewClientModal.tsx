import { Modal, Button, Form, Spinner } from 'react-bootstrap';

interface NewClientModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: { client_name: string; client_email: string };
  setFormData: (data: { client_name: string; client_email: string }) => void;
  saving: boolean;
}

export default function NewClientModal({
  show,
  onHide,
  onSubmit,
  formData,
  setFormData,
  saving,
}: NewClientModalProps) {
  return (
    <Modal show={show} onHide={onHide} dialogClassName="meu-modal-custom4" centered>
      <Modal.Header closeButton>
        <Modal.Title>Novo cliente</Modal.Title>
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
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: '0.8rem' }} className="text-muted">
              E-mail
            </Form.Label>
            <Form.Control
              className="input-foco-azul"
              type="email"
              value={formData.client_email}
              onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
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
