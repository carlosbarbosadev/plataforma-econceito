import React, { useState } from 'react';
import { Overlay, Popover, Form } from 'react-bootstrap';

import api from '../../../services/api';
import { Label } from '../../../types/crm';

const COLOR_OPTIONS = [
  { color: '#164b35', text_color: '#ffffff' },
  { color: '#533f04', text_color: '#ffffff' },
  { color: '#693200', text_color: '#ffffff' },
  { color: '#5d1f1a', text_color: '#ffffff' },
  { color: '#48245d', text_color: '#ffffff' },
  { color: '#216e4e', text_color: '#ffffff' },
  { color: '#7f5f01', text_color: '#ffffff' },
  { color: '#9e4c00', text_color: '#ffffff' },
  { color: '#ae2e24', text_color: '#ffffff' },
  { color: '#803fa5', text_color: '#ffffff' },
  { color: '#4bce97', text_color: '#ffffff' },
  { color: '#ddb30e', text_color: '#ffffff' },
  { color: '#fca700', text_color: '#ffffff' },
  { color: '#f87168', text_color: '#ffffff' },
  { color: '#c97cf4', text_color: '#ffffff' },
  { color: '#123263', text_color: '#ffffff' },
  { color: '#164555', text_color: '#ffffff' },
  { color: '#37471f', text_color: '#ffffff' },
  { color: '#50253f', text_color: '#ffffff' },
  { color: '#4b4d51', text_color: '#ffffff' },
  { color: '#1558bc', text_color: '#ffffff' },
  { color: '#206a83', text_color: '#ffffff' },
  { color: '#4c6b1f', text_color: '#ffffff' },
  { color: '#943d73', text_color: '#ffffff' },
  { color: '#63666b', text_color: '#ffffff' },
  { color: '#669df1', text_color: '#ffffff' },
  { color: '#6cc3e0', text_color: '#ffffff' },
  { color: '#94c748', text_color: '#ffffff' },
  { color: '#e774bb', text_color: '#ffffff' },
  { color: '#96999e', text_color: '#ffffff' },
];

interface LabelsPopoverProps {
  show: boolean;
  target: HTMLElement | null;
  onHide: () => void;
  selected: string[];
  onSelect: (label: string) => void;
  labels: Label[];
  onLabelsChanged: () => void;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function LabelsPopover({
  show,
  target,
  onHide,
  selected,
  onSelect,
  labels,
  onLabelsChanged,
}: LabelsPopoverProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setNameInput('');
    setSelectedColor(COLOR_OPTIONS[0]);
    setEditingLabel(null);
    setViewMode('list');
  };

  const handleCreate = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      await api.post('/api/crm/labels', {
        name: nameInput.trim(),
        color: selectedColor.color,
        text_color: selectedColor.text_color,
      });
      onLabelsChanged();
      resetForm();
    } catch (err) {
      console.error('Erro ao criar etiqueta:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!nameInput.trim() || !editingLabel) return;
    setSaving(true);
    try {
      await api.put(`/api/crm/labels/${editingLabel.id}`, {
        name: nameInput.trim(),
        color: selectedColor.color,
        text_color: selectedColor.text_color,
      });
      onLabelsChanged();
      resetForm();
    } catch (err) {
      console.error('Erro ao editar etiqueta:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingLabel) return;
    if (!window.confirm(`Excluir a etiqueta "${editingLabel.name}"?`)) return;
    setSaving(true);
    try {
      const deletedName = editingLabel.name;
      await api.delete(`/api/crm/labels/${editingLabel.id}`);
      if (selected.includes(deletedName)) {
        onSelect(deletedName);
      }
      onLabelsChanged();
      resetForm();
    } catch (err) {
      console.error('Erro ao excluir etiqueta:', err);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (label: Label) => {
    setEditingLabel(label);
    setNameInput(label.name);
    const match = COLOR_OPTIONS.find((c) => c.color === label.color);
    setSelectedColor(match || { color: label.color, text_color: label.text_color });
    setViewMode('edit');
  };

  const openCreate = () => {
    setNameInput('');
    setSelectedColor(COLOR_OPTIONS[0]);
    setEditingLabel(null);
    setViewMode('create');
  };

  const renderForm = () => (
    <div style={{ padding: '0 12px 12px' }} onMouseDown={(e) => e.stopPropagation()}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 0 4px 0',
          position: 'relative',
        }}
      >
        <button
          onClick={resetForm}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            position: 'absolute',
            left: 0,
          }}
        >
          <img src="/assets/icons/glass/arrow-left.svg" alt="Voltar" width={22} height={22} />
        </button>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#505258', width: '100%', textAlign: 'center' }}>
          {viewMode === 'create' ? 'Criar etiqueta' : 'Editar etiqueta'}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: '100%',
            height: 36,
            background: selectedColor.color,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 10,
          }}
        >
          <span style={{ color: selectedColor.text_color, fontWeight: 500, fontSize: '0.9rem' }}>
            {nameInput || ''}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#505258', marginBottom: 4 }}>
          Título
        </div>
        <input
          className="input-foco-azul"
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          maxLength={50}
          style={{
            width: '100%',
            height: 36,
            border: '1px solid #e0e0e0',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#505258', marginBottom: 6 }}>
          Selecione uma cor
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {COLOR_OPTIONS.map((opt) => (
            <div
              key={opt.color}
              onClick={() => setSelectedColor(opt)}
              style={{
                height: 32,
                borderRadius: 4,
                background: opt.color,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selectedColor.color === opt.color && (
                <img
                  src="/assets/icons/glass/black-check.svg"
                  alt="Selecionado"
                  width={19}
                  height={19}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '4px 0 12px' }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <button
          className="save-button2"
          onClick={viewMode === 'create' ? handleCreate : handleUpdate}
          disabled={saving || !nameInput.trim()}
          style={{
            opacity: saving || !nameInput.trim() ? 0.6 : 1,
          }}
        >
          {saving ? 'Salvando...' : viewMode === 'create' ? 'Criar' : 'Salvar'}
        </button>

        {viewMode === 'edit' && (
          <button
            className="cancel-button2"
            onClick={handleDelete}
            disabled={saving}
          >
            Excluir
          </button>
        )}
      </div>
    </div>
  );

  const renderList = () => (
    <Popover.Body style={{ padding: '8px 12px' }}>
      <Form>
        {labels.map((label) => (
          <div
            key={label.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(label.name)}
              onChange={() => onSelect(label.name)}
              style={{
                marginRight: 8,
                width: 15,
                height: 15,
                cursor: 'pointer',
              }}
            />
            <div
              onClick={() => onSelect(label.name)}
              style={{
                flex: 1,
                height: 32,
                background: label.color,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 10,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  color: label.text_color,
                  fontWeight: 500,
                  fontSize: '0.9rem',
                }}
              >
                {label.name}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEdit(label);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginLeft: 6,
                padding: '4px',
                fontSize: '0.85rem',
                color: '#888',
              }}
              title="Editar"
            >
              <img src="/assets/icons/glass/pen.svg" alt="Editar" width={14} height={14} />
            </button>
          </div>
        ))}
      </Form>

      <button
        onClick={openCreate}
        style={{
          width: '100%',
          padding: '8px 0',
          background: '#f0f0f0',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.85rem',
          color: '#505258',
          marginTop: 4,
        }}
      >
        Criar uma nova etiqueta
      </button>
    </Popover.Body>
  );

  return (
    <Overlay
      show={show}
      target={target}
      placement="bottom-start"
      containerPadding={0}
      rootClose={viewMode === 'list'}
      onHide={() => {
        onHide();
        resetForm();
      }}
    >
      <Popover
        id="labels-popover"
        style={{ minWidth: 300, boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}
        onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {viewMode === 'list' && (
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
        )}

        {viewMode === 'list' ? renderList() : renderForm()}
      </Popover>
    </Overlay>
  );
}
