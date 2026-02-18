import React, { useRef, useState } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';

import CrmComments from './CrmComments';
import api from '../../../services/api';
import LabelsPopover from './LabelsPopover';
import { Deal, Label } from '../../../types/crm';
import CrmAttachments, { CrmAttachmentsRef } from './CrmAttachments';

interface ClientDetailsModalProps {
  show: boolean;
  onHide: () => void;
  deal: Deal | null;
  onLabelsUpdated?: () => void;
  labels: Label[];
  onLabelsChanged: () => void;
}

export default function ClientDetailsModal({
  show,
  onHide,
  deal,
  onLabelsUpdated,
  labels,
  onLabelsChanged,
}: ClientDetailsModalProps) {
  const [showLabelsPopover, setShowLabelsPopover] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(deal?.labels || []);
  const [showDescriptionActions, setShowDescriptionActions] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [lastSavedDescription, setLastSavedDescription] = useState('');

  const attachmentsRef = useRef<CrmAttachmentsRef>(null);

  React.useEffect(() => {
    setSelectedLabels(deal?.labels || []);
    const initialDescription = deal?.description || '';
    setDescriptionInput(initialDescription);
    setLastSavedDescription(initialDescription);
    setShowDescriptionActions(false);
  }, [deal, show]);
  const etiquetasBtnRef = useRef<HTMLButtonElement>(null);

  async function updateLabelsOnServer(updatedLabels: string[]) {
    if (!deal?.deal_id) return;
    try {
      await api.put(`/api/crm/deals/${deal.deal_id}/labels`, { labels: updatedLabels });

      if (typeof onLabelsUpdated === 'function') {
        onLabelsUpdated();
      }
    } catch (err) {
      console.error('Erro ao salvar etiquetas:', err);
    }
  }

  function handleSelectLabel(label: string) {
    let newLabels: string[];

    if (selectedLabels.includes(label)) {
      newLabels = selectedLabels.filter((l) => l !== label);
    } else {
      newLabels = [...selectedLabels, label];
    }

    setSelectedLabels(newLabels);

    updateLabelsOnServer(newLabels);
  }

  async function handleSaveDescription() {
    if (!deal?.deal_id) return;

    setSavingDescription(true);
    try {
      await api.put(`/api/crm/deals/${deal.deal_id}/description`, {
        description: descriptionInput,
      });

      setLastSavedDescription(descriptionInput);

      if (typeof onLabelsUpdated === 'function') {
        onLabelsUpdated();
      }

      setShowDescriptionActions(false);
    } catch (err) {
      console.error('Erro ao salvar descrição:', err);
      alert('Erro ao salvar descrição.');
    } finally {
      setSavingDescription(false);
    }
  }

  const getWhatsappUrl = (phone: string) => {
    let cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
      cleanPhone = `55${cleanPhone}`;
    }

    return `https://web.whatsapp.com/send?phone=${cleanPhone}`;
  };

  const handleOpenWhatsapp = (phone: string | undefined) => {
    if (!phone) {
      alert('Cliente sem telefone cadastrado.');
      return;
    }

    const url = getWhatsappUrl(phone);

    const width = 1100;
    const height = 750;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
      url,
      'WhatsApp',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );
  };

  const handleDeleteDeal = async () => {
    if (!deal?.deal_id) return;
    if (!window.confirm(`Deseja excluir o deal de "${deal.client_name}"?`)) return;

    try {
      await api.delete(`/api/crm/deals/${deal.deal_id}`);
      onHide();
      if (onLabelsUpdated) onLabelsUpdated();
    } catch (err) {
      console.error('Erro ao excluir deal:', err);
      alert('Erro ao excluir deal.');
    }
  };

  return (
    <Modal show={show} onHide={onHide} dialogClassName="meu-modal-custom5" enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {deal?.client_phone && (
            <button
              onClick={() => handleOpenWhatsapp(deal.client_phone)}
              title="Conversar no WhatsApp"
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <img src="/assets/icons/glass/whatsapp.svg" alt="WhatsApp" width={26} height={26} />
            </button>
          )}
          {deal && !deal.client_id && (
            <button
              onClick={handleDeleteDeal}
              title="Excluir deal"
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <img src="/assets/icons/glass/circle-x-2.svg" alt="Excluir" width={27} height={27} />
            </button>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {deal && (
          <div style={{ display: 'flex', flexDirection: 'row', minHeight: 300 }}>
            <div style={{ flex: 1.8, paddingRight: 5 }}>
              <div
                style={{
                  fontSize: '1.5rem',
                  color: '#6b6e76',
                  fontWeight: 700,
                  marginBottom: 20,
                  maxWidth: '600px',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                }}
              >
                {deal.client_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                <img src="/assets/icons/glass/mail.svg" alt="Email" width={20} height={20} />
                <span style={{ color: '#6b6e76', fontSize: '1rem' }}>
                  {deal.client_email || '-'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
                <img src="/assets/icons/glass/phone.svg" alt="Phone" width={20} height={20} />
                <span style={{ color: '#6b6e76', fontSize: '1rem' }}>
                  {deal.client_phone || '-'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24, marginBottom: 40 }}>
                <button
                  type="button"
                  ref={etiquetasBtnRef}
                  onClick={() => setShowLabelsPopover(!showLabelsPopover)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f1f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid #e0e0e0',
                    background: '#fff',
                    color: '#505258',
                    borderRadius: 4,
                    padding: '6px 16px',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: 'none',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <img src="/assets/icons/glass/tag.svg" alt="Etiquetas" width={18} height={18} />
                  Etiquetas
                </button>
                <button
                  type="button"
                  onClick={() => attachmentsRef.current?.openFile()}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f1f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid #e0e0e0',
                    background: '#fff',
                    color: '#505258',
                    borderRadius: 4,
                    padding: '6px 16px',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: 'none',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <img
                    src="/assets/icons/glass/paperclip.svg"
                    alt="Anexar"
                    width={18}
                    height={18}
                  />
                  Anexo
                </button>
                <LabelsPopover
                  show={showLabelsPopover}
                  target={etiquetasBtnRef.current}
                  onHide={() => setShowLabelsPopover(false)}
                  selected={selectedLabels}
                  onSelect={handleSelectLabel}
                  labels={labels}
                  onLabelsChanged={onLabelsChanged}
                />
              </div>

              {selectedLabels.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#505258',
                      marginBottom: 6,
                    }}
                  >
                    Etiquetas
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedLabels.map((label) => {
                      const labelData = labels.find((l: Label) => l.name === label);
                      return (
                        <div
                          key={label}
                          style={{
                            display: 'flex',
                            height: 34,
                            background: labelData?.color || '#e0e0e0',
                            borderRadius: 4,
                            alignItems: 'center',
                            padding: '10px 10px',
                          }}
                        >
                          <span
                            style={{
                              color: labelData?.text_color || '#505258',
                              fontWeight: 500,
                              fontSize: '0.9rem',
                            }}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <div
                  style={{ fontSize: '0.9rem', fontWeight: 600, color: '#505258', marginBottom: 6 }}
                >
                  Descrição
                </div>

                <textarea
                  className="input-foco-azul"
                  placeholder="Adicione uma descrição mais detalhada..."
                  style={{
                    width: '100%',
                    minHeight: showDescriptionActions ? 100 : 70,
                    border: '1px solid #e0e0e0',
                    borderRadius: 4,
                    padding: '8px',
                    fontSize: '0.9rem',
                    color: '#505258',
                    resize: 'vertical',
                    transition: 'min-height 0.2s ease',
                  }}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  onFocus={() => setShowDescriptionActions(true)}
                />

                {showDescriptionActions && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <Button
                      className="cancel-button"
                      onClick={() => {
                        setDescriptionInput(lastSavedDescription);
                        setShowDescriptionActions(false);
                      }}
                    >
                      Cancelar
                    </Button>

                    <Button
                      className="save-button"
                      onClick={handleSaveDescription}
                      disabled={savingDescription}
                    >
                      {savingDescription ? <Spinner size="sm" /> : 'Salvar'}
                    </Button>
                  </div>
                )}
              </div>

              <CrmAttachments
                ref={attachmentsRef}
                dealId={deal.deal_id}
                onUpdate={onLabelsUpdated}
              />
            </div>

            <div style={{ width: 1, background: '#e0e0e0', margin: '0 16px' }} />
            <CrmComments dealId={deal.deal_id} onUpdate={onLabelsUpdated} />
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
