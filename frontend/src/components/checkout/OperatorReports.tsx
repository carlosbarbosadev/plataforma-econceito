import React, { useState, useEffect } from 'react';

import api from '../../services/api';

interface ReportData {
    resumo: {
        totalFinalizados: number;
        totalItensConferidos: number;
        tempoMedioSegundos: number;
    };
    operadores: Array<{
        id: number;
        nome: string;
        pedidos_finalizados: string;
        total_itens: string;
        tempo_medio_segundos: string | null;
    }>;
    historico: Array<{
        id: number;
        numero_pedido: string;
        acao: string;
        total_skus: number;
        total_itens: number;
        criado_em: string;
        operador: string;
        detalhes?: {
            skuAntigo: string;
            nomeAntigo: string;
            skuNovo: string;
            nomeNovo: string;
            quantidade: number;
        } | null;
    }>;
    graficoDiario: Array<{
        dia: string;
        total: number;
        operadores: Array<{ nome: string; total: number }>;
    }>;
}

interface OperatorReportsProps {
    onClose: () => void;
}

const formatTempo = (segundos: number | null): string => {
    if (!segundos || segundos <= 0) return '-';
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    if (min === 0) return `${seg}s`;
    return `${min}min ${seg}s`;
};

const formatAcao = (acao: string): { label: string; color: string } => {
    const map: Record<string, { label: string; color: string }> = {
        iniciar_checkout: { label: 'Início', color: '#0d6efd' },
        salvar_parcial: { label: 'Salvo parcial', color: '#fd7e14' },
        finalizar: { label: 'Finalizado', color: '#198754' },
        saldo_pendente: { label: 'Saldo pendente', color: '#6f42c1' },
        substituicao_produto: { label: 'Substituição', color: '#dc3545' },
    };
    return map[acao] || { label: acao, color: '#6c757d' };
};

const OperatorReports: React.FC<OperatorReportsProps> = ({ onClose }) => {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataInicio, setDataInicio] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
    const [operadorId, setOperadorId] = useState<string>('');
    const [operadores, setOperadores] = useState<Array<{ id: number; nome: string }>>([]);

    useEffect(() => {
        api.get('/api/checkout/operadores').then((res) => {
            setOperadores(res.data);
        }).catch(() => { });
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: any = { dataInicio, dataFim };
            if (operadorId) params.operadorId = operadorId;
            const res = await api.get('/api/checkout/relatorio', { params });
            setData(res.data);
        } catch (err) {
            console.error('Erro ao buscar relatório:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [dataInicio, dataFim, operadorId]);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                paddingTop: '80px',
                zIndex: 9999,
                overflowY: 'auto',
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    width: '900px',
                    maxWidth: '95vw',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '20px 28px',
                        borderBottom: '1px solid #e9ecef',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#fff',
                    }}
                >
                    <h5 style={{ margin: 0, fontWeight: 600, color: '#1f2a3b' }}>
                        Informações de operadores
                    </h5>
                    <button
                        onClick={onClose}
                        type="button"
                        className="btn-close"
                        aria-label="Fechar"
                        style={{ transform: 'scale(0.9)', marginRight: '-8px', outline: 'none', boxShadow: 'none' }}
                    />
                </div>

                {/* Filters */}
                <div
                    style={{
                        padding: '16px 28px',
                        backgroundColor: '#fff',
                        borderBottom: '1px solid #e9ecef',
                        display: 'flex',
                        gap: '20px',
                        alignItems: 'flex-end',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 500 }}>Início do período</label>
                        <input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                            className="form-control form-control-sm input-foco-verde"
                            style={{ width: '160px', borderRadius: '6px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 500 }}>Fim do período</label>
                        <input
                            type="date"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                            className="form-control form-control-sm input-foco-verde"
                            style={{ width: '160px', borderRadius: '6px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: 'auto' }}>
                        <label style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 500 }}>Operador</label>
                        <select
                            value={operadorId}
                            onChange={(e) => setOperadorId(e.target.value)}
                            className="form-select form-select-sm input-foco-verde"
                            style={{ minWidth: '140px', borderRadius: '6px' }}
                        >
                            <option value="">Todos</option>
                            {operadores.map((op) => (
                                <option key={op.id} value={op.id}>{op.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div className="text-center py-5">
                            <span style={{ color: '#6c757d' }}>Carregando...</span>
                        </div>
                    ) : data ? (
                        <>
                            {/* Summary Cards */}
                            <div className="d-flex gap-3 mb-4">
                                <div
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#fff',
                                        borderRadius: '10px',
                                        padding: '20px',
                                        border: '1px solid #e9ecef',
                                    }}
                                >
                                    <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '4px' }}>
                                        Pedidos finalizados
                                    </div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#198754' }}>
                                        {data.resumo.totalFinalizados}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#fff',
                                        borderRadius: '10px',
                                        padding: '20px',
                                        border: '1px solid #e9ecef',
                                    }}
                                >
                                    <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '4px' }}>
                                        Total de itens
                                    </div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0d6efd' }}>
                                        {data.resumo.totalItensConferidos}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#fff',
                                        borderRadius: '10px',
                                        padding: '20px',
                                        border: '1px solid #e9ecef',
                                    }}
                                >
                                    <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '4px' }}>
                                        Tempo médio
                                    </div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fd7e14' }}>
                                        {formatTempo(data.resumo.tempoMedioSegundos)}
                                    </div>
                                </div>
                            </div>

                            {/* Operators Table - only when viewing all */}
                            {!operadorId && (
                                <div
                                    style={{
                                        backgroundColor: '#fff',
                                        borderRadius: '10px',
                                        border: '1px solid #e9ecef',
                                        overflow: 'hidden',
                                        marginBottom: '20px',
                                    }}
                                >
                                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #e9ecef' }}>
                                        <span style={{ fontWeight: 600, color: '#1f2a3b', fontSize: '0.95rem' }}>
                                            Desempenho por operador
                                        </span>
                                    </div>
                                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                                <th style={{ padding: '10px 20px', color: '#6c757d', fontWeight: 600 }}>Operador</th>
                                                <th style={{ padding: '10px 16px', color: '#6c757d', fontWeight: 600, textAlign: 'center' }}>Finalizados</th>
                                                <th style={{ padding: '10px 16px', color: '#6c757d', fontWeight: 600, textAlign: 'center' }}>Itens</th>
                                                <th style={{ padding: '10px 16px', color: '#6c757d', fontWeight: 600, textAlign: 'center' }}>Tempo Médio</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.operadores.map((op) => (
                                                <tr key={op.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                                                    <td style={{ padding: '12px 20px', color: '#1f2a3b', fontWeight: 500 }}>
                                                        {op.nome}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#495769' }}>
                                                        {op.pedidos_finalizados}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#495769' }}>
                                                        {op.total_itens}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#495769' }}>
                                                        {formatTempo(parseFloat(op.tempo_medio_segundos || '0'))}
                                                    </td>
                                                </tr>
                                            ))}
                                            {data.operadores.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#adb5bd' }}>
                                                        Nenhum dado no período
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* History Table */}
                            <div
                                style={{
                                    backgroundColor: '#fff',
                                    borderRadius: '10px',
                                    border: '1px solid #e9ecef',
                                    overflow: 'hidden',
                                }}
                            >
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e9ecef' }}>
                                    <span style={{ fontWeight: 600, color: '#1f2a3b', fontSize: '0.95rem' }}>
                                        Histórico de ações
                                    </span>
                                </div>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                                                <th style={{ padding: '10px 20px', color: '#6c757d', fontWeight: 600 }}>Pedido</th>
                                                <th style={{ padding: '10px 16px', color: '#6c757d', fontWeight: 600 }}>Operador</th>
                                                <th style={{ padding: '10px 16px', color: '#6c757d', fontWeight: 600 }}>Ação</th>
                                                <th style={{ padding: '10px 16px', color: '#6c757d', fontWeight: 600, textAlign: 'center' }}>SKUs</th>
                                                <th style={{ padding: '10px 16px', color: '#6c757d', fontWeight: 600, textAlign: 'center' }}>Itens</th>
                                                <th style={{ padding: '10px 16px', color: '#6c757d', fontWeight: 600 }}>Horário</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.historico.map((log) => {
                                                const acao = formatAcao(log.acao);
                                                return (
                                                    <tr key={log.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                                                        <td style={{ padding: '10px 20px', color: '#1f2a3b', fontWeight: 500 }}>
                                                            #{log.numero_pedido}
                                                        </td>
                                                        <td style={{ padding: '10px 16px', color: '#495769' }}>
                                                            {log.operador || '-'}
                                                        </td>
                                                        <td style={{ padding: '10px 16px' }}>
                                                            <span
                                                                style={{
                                                                    backgroundColor: acao.color + '15',
                                                                    color: acao.color,
                                                                    padding: '3px 10px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                {acao.label}
                                                            </span>
                                                            {log.detalhes && log.acao === 'substituicao_produto' && (
                                                                <div style={{ marginTop: '4px' }}>
                                                                    <span
                                                                        style={{
                                                                            backgroundColor: '#6c757d15',
                                                                            color: '#6c757d',
                                                                            padding: '3px 10px',
                                                                            borderRadius: '12px',
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 500,
                                                                        }}
                                                                    >
                                                                        {log.detalhes.skuAntigo} → {log.detalhes.skuNovo}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px 16px', textAlign: 'center', color: '#495769' }}>
                                                            {log.total_skus || '-'}
                                                        </td>
                                                        <td style={{ padding: '10px 16px', textAlign: 'center', color: '#495769' }}>
                                                            {log.total_itens || '-'}
                                                        </td>
                                                        <td style={{ padding: '10px 16px', color: '#495769', fontSize: '0.8rem' }}>
                                                            {new Date(log.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {data.historico.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#adb5bd' }}>
                                                        Nenhuma ação no período
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Bar Chart - Last 7 days */}
                            {data.graficoDiario && data.graficoDiario.length > 0 && (
                                <div
                                    style={{
                                        backgroundColor: '#fff',
                                        borderRadius: '10px',
                                        border: '1px solid #e9ecef',
                                        padding: '20px',
                                        marginTop: '20px',
                                        width: '50%',
                                    }}
                                >
                                    <div style={{ marginBottom: '16px' }}>
                                        <span style={{ fontWeight: 600, color: '#1f2a3b', fontSize: '0.95rem' }}>
                                            Pedidos finalizados
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px' }}>
                                        {(() => {
                                            const maxTotal = Math.max(...data.graficoDiario.map(d => d.total), 1);
                                            return data.graficoDiario.map((dia) => {
                                                const height = dia.total > 0 ? Math.max((dia.total / maxTotal) * 130, 8) : 4;
                                                const dateObj = new Date(dia.dia + 'T12:00:00');
                                                const label = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                                                const dateLabel = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                                return (
                                                    <div
                                                        key={dia.dia}
                                                        style={{
                                                            flex: 1,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {/* Tooltip */}
                                                        <div
                                                            className="chart-tooltip"
                                                            style={{
                                                                position: 'absolute',
                                                                bottom: `${height + 30}px`,
                                                                backgroundColor: '#1f2a3b',
                                                                color: '#fff',
                                                                padding: '8px 12px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                whiteSpace: 'nowrap',
                                                                opacity: 0,
                                                                pointerEvents: 'none',
                                                                transition: 'opacity 0.2s',
                                                                zIndex: 10,
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.9rem' }}>{dia.total} pedido{dia.total !== 1 ? 's' : ''}</div>
                                                            {dia.operadores.map((op, i) => (
                                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                                                    <span>{op.nome}</span>
                                                                    <span style={{ fontWeight: 600 }}>{op.total}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Bar */}
                                                        <div
                                                            style={{
                                                                width: '100%',
                                                                maxWidth: '48px',
                                                                height: `${height}px`,
                                                                backgroundColor: dia.total > 0 ? '#34ad61' : '#e9ecef',
                                                                borderRadius: '4px 4px 0 0',
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (dia.total > 0) e.currentTarget.style.backgroundColor = '#2d9654';
                                                                const tooltip = e.currentTarget.parentElement?.querySelector('.chart-tooltip') as HTMLElement;
                                                                if (tooltip) tooltip.style.opacity = '1';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (dia.total > 0) e.currentTarget.style.backgroundColor = '#34ad61';
                                                                const tooltip = e.currentTarget.parentElement?.querySelector('.chart-tooltip') as HTMLElement;
                                                                if (tooltip) tooltip.style.opacity = '0';
                                                            }}
                                                        />
                                                        {/* Label */}
                                                        <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '6px', textAlign: 'center' }}>
                                                            <div style={{ textTransform: 'capitalize' }}>{label}</div>
                                                            <div>{dateLabel}</div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default OperatorReports;
