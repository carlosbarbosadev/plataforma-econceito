import { Modal, Button, Form, Spinner } from 'react-bootstrap';

interface NewClientModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: { client_name: string; client_email: string; client_phone: string };
  setFormData: (data: { client_name: string; client_email: string; client_phone: string }) => void;
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
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

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
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: '0.8rem' }} className="text-muted">
              Celular
            </Form.Label>
            <Form.Control
              className="input-foco-azul"
              type="tel"
              value={formData.client_phone}
              onChange={(e) => setFormData({ ...formData, client_phone: formatPhone(e.target.value) })}
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
