import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

import api from '../../../services/api';

interface Attachment {
  id: number;
  file_name: string;
  created_at: string;
  file_type: string;
}

interface CrmAttachmentsProps {
  dealId: string | null;
  onUpdate?: () => void;
}

export interface CrmAttachmentsRef {
  openFile: () => void;
}

interface PreviewData {
  url: string;
  type: string;
}

const CrmAttachments = forwardRef<CrmAttachmentsRef, CrmAttachmentsProps>(
  ({ dealId, onUpdate }, ref) => {
    const [files, setFiles] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [previewData, setPreviewData] = useState<PreviewData | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      openFile: () => {
        fileInputRef.current?.click();
      },
    }));

    useEffect(() => {
      if (dealId) loadFiles();
    }, [dealId]);

    const loadFiles = async () => {
      if (!dealId) return;
      setLoading(true);
      try {
        const res = await api.get(`/api/crm/deals/${dealId}/attachments`);
        setFiles(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !dealId) return;

      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      setUploading(true);
      try {
        const res = await api.post(`/api/crm/deals/${dealId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setFiles([res.data, ...files]);

        if (onUpdate) onUpdate();
      } catch (err) {
        alert('Erro ao enviar arquivo.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    const handleDelete = async (id: number) => {
      if (!window.confirm('Excluir este anexo?')) return;
      try {
        await api.delete(`/api/crm/attachments/${id}`);
        setFiles(files.filter((f) => f.id !== id));
        if (onUpdate) onUpdate();
      } catch (err) {
        alert('Erro ao excluir.');
      }
    };

    const handleOpenFile = (file: Attachment) => {
      const baseURL = api.defaults.baseURL || 'http://localhost:3000';
      const fileUrl = `${baseURL}/api/crm/attachments/${file.id}/download`;

      const isImage = file.file_type && file.file_type.startsWith('image/');
      const isPdf = file.file_type === 'application/pdf';

      if (isImage || isPdf) {
        setPreviewData({ url: fileUrl, type: file.file_type });
      } else {
        window.open(fileUrl, '_blank');
      }
    };

    const formatDate = (dateString: string) => {
      const d = new Date(dateString);
      return `Adicionado há ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
      <>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
        />

        {files.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 15,
              }}
            >
              <div
                style={{ fontSize: '0.9rem', fontWeight: 600, color: '#505258', marginBottom: 6 }}
              >
                Anexos
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="cancel-button">
                Adicionar
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#505258', marginBottom: 2 }}>
              Arquivos
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {files.map((file) => (
                <div
                  key={file.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 0',
                  }}
                >
                  <div
                    onClick={() => handleOpenFile(file)}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 4,
                      background: '#f8f9fa',
                      border: '1px solid #e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    {file.file_type && file.file_type.startsWith('image/') ? (
                      <img
                        src={`${api.defaults.baseURL || 'http://localhost:3000'}/api/crm/attachments/${file.id}/download`}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '800',
                            color: '#5f6368',
                            lineHeight: 1,
                            letterSpacing: '0.5px',
                          }}
                        >
                          PDF
                        </span>
                        <div
                          style={{ width: '100%', height: 1, background: '#1a73e8', marginTop: 1 }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => handleOpenFile(file)}
                      style={{
                        fontWeight: 600,
                        color: '#383838ff',
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {file.file_name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                      {formatDate(file.created_at)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleDelete(file.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#383838ff',
                        fontSize: '1.2rem',
                        lineHeight: 1,
                      }}
                      title="Excluir"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {previewData && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.85)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40,
            }}
            onClick={() => setPreviewData(null)}
          >
            {previewData.type === 'application/pdf' ? (
              <iframe
                src={`${previewData.url}#toolbar=0&navpanes=0`}
                title="PDF Preview"
                style={{
                  width: '65vw',
                  height: '85vh',
                  background: '#fff',
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={previewData.url}
                alt="Visualização"
                style={{
                  maxWidth: '90%',
                  maxHeight: '90%',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            <button
              onClick={() => setPreviewData(null)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '2rem',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              &times;
            </button>

            {/* SÓ MOSTRA ESTE BOTÃO SE NÃO FOR PDF */}
            {previewData.type !== 'application/pdf' && (
              <a
                href={previewData.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  position: 'absolute',
                  bottom: 30,
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: 20,
                  cursor: 'pointer',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                Abrir em uma nova guia
              </a>
            )}
          </div>
        )}
      </>
    );
  }
);

export default CrmAttachments;
