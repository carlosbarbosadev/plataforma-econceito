import React, { useState, useEffect } from 'react';

import api from '../../services/api';

interface Operator {
    id: number;
    nome: string;
}

interface OperatorSelectorProps {
    onSelect: (operator: Operator) => void;
    onOpenReports?: () => void;
}

const OperatorSelector: React.FC<OperatorSelectorProps> = ({ onSelect, onOpenReports }) => {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedOp, setSelectedOp] = useState<Operator | null>(null);
    const [senha, setSenha] = useState('');
    const [loginError, setLoginError] = useState('');

    const [newName, setNewName] = useState('');
    const [newSenha, setNewSenha] = useState('');

    const fetchOperators = async () => {
        try {
            const res = await api.get('/api/checkout/operadores');
            setOperators(res.data);
        } catch (err) {
            console.error('Erro ao buscar operadores:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOperators();
    }, []);

    const handleLogin = async () => {
        if (!selectedOp || !senha) return;
        setLoginError('');
        try {
            const res = await api.post('/api/checkout/operadores/verificar', {
                id: selectedOp.id,
                senha,
            });
            onSelect(res.data);
        } catch (err: any) {
            setLoginError(err.response?.data?.mensagem || 'Erro ao verificar');
        }
    };

    const handleCreate = async () => {
        if (!newName.trim() || !newSenha.trim()) return;
        try {
            const res = await api.post('/api/checkout/operadores', {
                nome: newName.trim(),
                senha: newSenha.trim(),
            });
            setOperators((prev) => [...prev, res.data].sort((a, b) => a.nome.localeCompare(b.nome)));
            setNewName('');
            setNewSenha('');
        } catch (err) {
            console.error('Erro ao criar operador:', err);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/api/checkout/operadores/${id}`);
            setOperators((prev) => prev.filter((o) => o.id !== id));
            if (selectedOp?.id === id) {
                setSelectedOp(null);
                setSenha('');
            }
        } catch (err) {
            console.error('Erro ao remover operador:', err);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: '56px',
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                paddingBottom: '10vh',
            }}
        >
            <div
                style={{
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'row',
                    boxShadow: '0 8px 15px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                }}
            >
                {/* Coluna esquerda: Operador */}
                <div
                    style={{
                        padding: '28px 32px 25px',
                        width: '420px',
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto',
                    }}
                >
                    {/* SEÇÃO 1: SELECIONAR OPERADOR */}
                    <div className="d-flex align-items-center" style={{ marginBottom: '12px' }}>
                        <h5 className="mb-0" style={{ color: '#1f2a3b', fontWeight: 600 }}>
                            Operador
                        </h5>
                    </div>

                    {loading ? (
                        <div className="text-center py-3">
                            <span style={{ color: '#6c757d' }}>Carregando...</span>
                        </div>
                    ) : operators.length === 0 ? (
                        <div
                            className="text-center py-4"
                            style={{ color: '#adb5bd', fontSize: '0.9rem' }}
                        >
                            Nenhum operador cadastrado
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {operators.map((op) => {
                                const isSelected = selectedOp?.id === op.id;
                                return (
                                    <div
                                        key={op.id}
                                        className="d-flex align-items-center justify-content-between"
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: isSelected ? '1px solid #34ad61' : '1px solid #e9ecef',
                                            backgroundColor: isSelected ? '#eef9f3' : '#fff',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onClick={() => {
                                            setSelectedOp(op);
                                            setSenha('');
                                            setLoginError('');
                                        }}
                                    >
                                        <div className="d-flex align-items-center gap-2">
                                            <div
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#eef9f3',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <img
                                                    src="/assets/icons/glass/green-client.svg"
                                                    alt=""
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                            </div>
                                            <span style={{ fontWeight: 500, color: '#1f2a3b' }}>{op.nome}</span>
                                        </div>
                                        <button
                                            className="btn btn-sm p-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(op.id);
                                            }}
                                            style={{ color: '#dc3545' }}
                                            title="Remover operador"
                                        >
                                            <img src="/assets/icons/glass/trash.svg" alt="Remover" style={{ width: '19px', height: '19px' }} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Input de senha quando operador está selecionado */}
                    {selectedOp && (
                        <div className="mb-3">
                            <div className="d-flex gap-2">
                                <input
                                    type="password"
                                    value={senha}
                                    onChange={(e) => {
                                        setSenha(e.target.value);
                                        setLoginError('');
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                    placeholder="Senha"
                                    className="form-control input-foco-verde"
                                    style={{
                                        borderRadius: '6px',
                                        fontSize: '0.9rem',
                                        border: loginError ? '1px solid #dc3545' : '1px solid #dee2e6',
                                    }}
                                    autoFocus
                                />
                                <button
                                    onClick={handleLogin}
                                    disabled={!senha}
                                    className="btn d-flex align-items-center"
                                    style={{
                                        backgroundColor: '#34ad61',
                                        color: '#fff',
                                        borderRadius: '6px',
                                        padding: '6px 20px',
                                        whiteSpace: 'nowrap',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    Entrar
                                </button>
                            </div>
                            {loginError && (
                                <small style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                                    {loginError}
                                </small>
                            )}
                        </div>
                    )}

                    {/* DIVISOR */}
                    <hr style={{ borderColor: '#adb5bd', margin: '8px -32px 28px' }} />

                    {/* SEÇÃO 2: CADASTRAR NOVO */}
                    <p style={{ color: '#6c757d', fontSize: '0.85rem', marginBottom: '12px' }}>
                        Novo operador
                    </p>

                    <div className="d-flex flex-column gap-2">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Nome"
                            className="form-control input-foco-verde"
                            style={{
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                border: '1px solid #dee2e6',
                            }}
                        />
                        <div className="d-flex gap-2">
                            <input
                                type="password"
                                value={newSenha}
                                onChange={(e) => setNewSenha(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                placeholder="Senha"
                                className="form-control input-foco-verde"
                                style={{
                                    borderRadius: '6px',
                                    fontSize: '0.9rem',
                                    border: '1px solid #dee2e6',
                                }}
                            />
                            <button
                                onClick={handleCreate}
                                disabled={!newName.trim() || !newSenha.trim()}
                                className="btn d-flex align-items-center"
                                style={{
                                    backgroundColor: '#34ad61',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    padding: '6px 16px',
                                    whiteSpace: 'nowrap',
                                    fontSize: '0.9rem',
                                }}
                            >
                                Criar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Divisor vertical + Coluna direita: Relatórios */}
                {onOpenReports && (
                    <>
                        <div style={{ width: '1px', backgroundColor: '#e9ecef' }} />
                        <div
                            onClick={onOpenReports}
                            style={{
                                padding: '20px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                gap: '6px',
                                transition: 'background-color 0.2s, color 0.2s',
                                borderRadius: '0 10px 10px 0',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#34ad61';
                                const img = e.currentTarget.querySelector('img') as HTMLImageElement;
                                if (img) img.src = '/assets/icons/glass/white-calendar-user.svg';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                const img = e.currentTarget.querySelector('img') as HTMLImageElement;
                                if (img) img.src = '/assets/icons/glass/green-calendar-user.svg';
                            }}
                        >
                            <img
                                src="/assets/icons/glass/green-calendar-user.svg"
                                alt="Relatórios"
                                style={{ width: '24px', height: '24px' }}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default OperatorSelector;
