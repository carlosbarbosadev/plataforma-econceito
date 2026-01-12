import { Spinner } from 'react-bootstrap';
import { useState, useEffect } from 'react';

import api from '../../../services/api';

interface Comment {
  id: number;
  comment: string;
  created_at: string;
}

interface CrmCommentsProps {
  dealId: string | null;
  onUpdate?: () => void;
}

export default function CrmComments({ dealId, onUpdate }: CrmCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      if (!dealId) return;
      setLoading(true);
      try {
        const res = await api.get(`/api/crm/deals/${dealId}/comments`);
        setComments(res.data);
      } catch (err) {
        setComments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [dealId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !dealId) return;

    setSending(true);
    try {
      const res = await api.post(`/api/crm/deals/${dealId}/comments`, {
        comment: commentInput,
      });
      setComments([res.data, ...comments]);
      setCommentInput('');

      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao enviar comentário:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('Excluir este comentário?')) return;

    setDeletingId(commentId);
    try {
      await api.delete(`/api/crm/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Não foi possível excluir o comentário.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div
      style={{
        flex: 1.3,
        background: '#f5f5f5',
        borderRadius: 4,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: '0.9rem',
          color: '#505258',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        Comentários
      </div>

      {/* Formulário de Envio */}
      <form
        style={{
          marginBottom: 20,
          marginTop: 15,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
        onSubmit={handleSubmit}
      >
        <input
          className="input-foco-azul"
          type="text"
          placeholder="Escrever um comentário..."
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          disabled={sending}
          style={{
            width: '100%',
            height: 39,
            border: '1px solid #e0e0e0',
            borderRadius: 4,
            padding: '10px 12px',
            fontSize: '0.9rem',
            outline: 'none',
            background: '#fff',
            color: '#505258',
          }}
        />
        <button
          className="save-button"
          type="submit"
          disabled={sending || !commentInput.trim()}
          style={{
            background: sending || !commentInput.trim() ? '#bbc1c5ff' : '#1868db',

            cursor: sending || !commentInput.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? <Spinner size="sm" animation="border" /> : 'Salvar'}
        </button>
      </form>

      {/* Lista de Comentários com Scroll */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflowY: 'auto',
          maxHeight: '400px',
        }}
      >
        {loading ? (
          <div style={{ color: '#888', fontSize: '0.95rem', textAlign: 'center', marginTop: 20 }}>
            <Spinner animation="border" size="sm" style={{ marginRight: 8 }} />
            Carregando...
          </div>
        ) : comments.length === 0 ? (
          <div
            style={{
              color: '#aaa',
              fontSize: '0.9rem',
              textAlign: 'center',
              marginTop: 20,
              fontStyle: 'italic',
            }}
          >
            Nenhum comentário.
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 12,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                display: 'flex',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#132649',
                  color: '#f8f8f8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  flexShrink: 0,
                  userSelect: 'none',
                }}
              >
                VC
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: '#444',
                    fontSize: '0.9rem',
                    marginBottom: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Você</span>
                  <span style={{ fontSize: '0.75rem', color: '#999', fontWeight: 400 }}>
                    {formatDate(c.created_at)}
                  </span>
                </div>
                <div
                  style={{
                    color: '#35363a',
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {c.comment}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#252525ff',
                      fontSize: '0.75rem',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      opacity: 0.8,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                  >
                    {deletingId === c.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
