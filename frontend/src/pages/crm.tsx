import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Dropdown } from 'react-bootstrap';

import api from '../services/api';
import KanbanColumn from '../components/crm/KanbanColumn';
import ColumnModal from '../components/modals/crm/ColumnModal';
import { Column, ColumnConfig, Deal, Label } from '../types/crm';
import NewClientModal from '../components/modals/crm/NewClientModal';
import ClientDetailsModal from '../components/modals/crm/ClientDetailsModal';

export default function CRMPage() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ client_name: '', client_email: '', client_phone: '' });
  const [columnFormData, setColumnFormData] = useState({ title: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  const processDeals = useCallback(
    (deals: any[], colsConfig: ColumnConfig[]): Column[] =>
      colsConfig.map((col) => ({
        ...col,
        deals: deals
          .filter((deal) => deal.column_status === col.title)
          .map((deal) => ({
            ...deal,
            id: deal.deal_id,
          }))
          .sort((a, b) => a.position - b.position),
      })),
    []
  );

  const filteredColumns = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        deals: col.deals.filter((deal) => {
          const matchesSearch =
            (deal.client_name && deal.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (deal.client_email && deal.client_email.toLowerCase().includes(searchTerm.toLowerCase()));

          const matchesLabels =
            selectedLabels.length === 0 ||
            (deal.labels && deal.labels.some((label) => selectedLabels.includes(label)));

          return matchesSearch && matchesLabels;
        }),
      })),
    [columns, searchTerm, selectedLabels]
  );

  const fetchColumns = useCallback(async () => {
    try {
      const response = await api.get('/api/crm/columns');
      setColumnsConfig(response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar colunas:', error);
      return [];
    }
  }, []);

  const fetchDeals = useCallback(
    async (colsConfig: ColumnConfig[]) => {
      try {
        const response = await api.get('/api/crm/deals');
        const processedColumns = processDeals(response.data, colsConfig);
        setColumns(processedColumns);
      } catch (error) {
        console.error('Erro ao buscar deals:', error);
      }
    },
    [processDeals]
  );

  const fetchLabels = useCallback(async () => {
    try {
      const res = await api.get('/api/crm/labels');
      setLabels(res.data);
    } catch (error) {
      console.error('Erro ao buscar etiquetas:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const colsConfig = await fetchColumns();
    await Promise.all([fetchDeals(colsConfig), fetchLabels()]);
    setLoading(false);
  }, [fetchColumns, fetchDeals, fetchLabels]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const previousColumns = JSON.parse(JSON.stringify(columns));

    const sourceColIndex = columns.findIndex((col) => col.title === source.droppableId);
    const destColIndex = columns.findIndex((col) => col.title === destination.droppableId);

    if (sourceColIndex === -1 || destColIndex === -1) return;

    const newColumns = [...columns];
    const sourceCol = {
      ...newColumns[sourceColIndex],
      deals: [...newColumns[sourceColIndex].deals],
    };
    const destCol =
      source.droppableId === destination.droppableId
        ? sourceCol
        : { ...newColumns[destColIndex], deals: [...newColumns[destColIndex].deals] };

    const movedDealIndex = sourceCol.deals.findIndex(
      (d) => String(d.deal_id ?? d.client_id) === draggableId
    );

    if (movedDealIndex === -1) return;

    const [movedDeal] = sourceCol.deals.splice(movedDealIndex, 1);

    movedDeal.column_status = destination.droppableId;
    movedDeal.position = destination.index;

    destCol.deals.splice(destination.index, 0, movedDeal);

    destCol.deals.forEach((deal, index) => {
      deal.position = index;
    });

    if (source.droppableId !== destination.droppableId) {
      sourceCol.deals.forEach((deal, index) => {
        deal.position = index;
      });
      newColumns[sourceColIndex] = sourceCol;
      newColumns[destColIndex] = destCol;
    } else {
      newColumns[sourceColIndex] = sourceCol;
    }

    setColumns(newColumns);

    try {
      const moveId = movedDeal.client_id || movedDeal.deal_id;
      await api.put(`/api/crm/deals/${moveId}/move`, {
        column_status: destination.droppableId,
        position: destination.index,
      });
    } catch (error) {
      console.error('Erro ao mover card:', error);
      setColumns(previousColumns);
    }
  };

  const handleCreateDeal = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_name.trim()) return;

    try {
      setSaving(true);
      await api.post('/api/crm/deals', {
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
      });
      setShowModal(false);
      setFormData({ client_name: '', client_email: '', client_phone: '' });
      loadData();
    } catch (error) {
      console.error('Erro ao criar deal:', error);
    } finally {
      setSaving(false);
    }
  }, [formData, loadData]);

  const handleOpenColumnModal = useCallback((column?: ColumnConfig) => {
    if (column) {
      setEditingColumn(column);
      setColumnFormData({ title: column.title });
    } else {
      setEditingColumn(null);
      setColumnFormData({ title: '' });
    }
    setShowColumnModal(true);
  }, []);

  const handleSaveColumn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!columnFormData.title.trim()) return;

    try {
      setSaving(true);

      if (editingColumn) {
        await api.put(`/api/crm/columns/${editingColumn.id}`, {
          title: columnFormData.title,
        });
      } else {
        await api.post('/api/crm/columns', {
          title: columnFormData.title,
        });
      }

      setShowColumnModal(false);
      setColumnFormData({ title: '' });
      setEditingColumn(null);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar coluna:', error);
    } finally {
      setSaving(false);
    }
  }, [columnFormData.title, editingColumn, loadData]);

  const handleDeleteColumn = useCallback(async (column: ColumnConfig) => {
    if (columns.length <= 1) {
      alert('Você precisa ter pelo menos uma coluna.');
      return;
    }

    const hasDeals = columns.find((c) => c.id === column.id)?.deals.length || 0;
    const confirmMessage =
      hasDeals > 0
        ? `Esta coluna possui ${hasDeals} cliente(s). Eles serão movidos para a primeira coluna. Deseja continuar?`
        : `Deseja realmente excluir a coluna "${column.title}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.delete(`/api/crm/columns/${column.id}`);
      loadData();
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
    }
  }, [columns, loadData]);

  const reloadDeals = useCallback(async () => {
    const colsConfig = await fetchColumns();
    await fetchDeals(colsConfig);
  }, [fetchColumns, fetchDeals]);

  const handleCardClick = useCallback(async (deal: Deal) => {
    if (!deal.deal_id && deal.client_id) {
      try {
        const res = await api.post('/api/crm/deals/ensure', { client_id: deal.client_id });
        const updatedDeal = { ...deal, deal_id: res.data.deal_id };
        setSelectedDeal(updatedDeal);
        setShowDealModal(true);

        // Atualiza o deal na lista local para não precisar de reload
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            deals: col.deals.map((d) =>
              d.client_id === deal.client_id ? { ...d, deal_id: res.data.deal_id } : d
            ),
          }))
        );
      } catch (err) {
        console.error('Erro ao criar deal:', err);
        alert('Erro ao abrir detalhes do cliente.');
      }
    } else {
      setSelectedDeal(deal);
      setShowDealModal(true);
    }
  }, []);

  const toggleLabelFilter = useCallback((labelName: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelName) ? prev.filter((l) => l !== labelName) : [...prev, labelName]
    );
  }, []);

  if (loading) {
    return (
      <Container
        fluid
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: '400px' }}
      >
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }



  return (
    <Container
      fluid
      className="mt-4 d-flex flex-column"
      style={{ height: 'calc(102.1vh - 100px)', scrollbarGutter: 'stable' }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
        <h3 className="mb-0 fw-bold">CRM Vendas</h3>
      </div>

      <div className="d-flex align-items-center gap-3 mb-4">
        <Form.Control
          className="input-foco-azul"
          type="text"
          placeholder="Pesquisar cliente"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '350px', borderRadius: '4px' }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            minWidth: 'fit-content',
            backgroundColor: '#1868db',
            border: 'none',
            borderRadius: 4,
            padding: '0 24px',
            height: 48,
          }}
        >
          <div
            title="Novo cliente"
            onClick={() => setShowModal(true)}
            onMouseEnter={() => setHoveredIcon('new-client')}
            onMouseLeave={() => setHoveredIcon(null)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 7,
              borderRadius: '50%',
              backgroundColor: hoveredIcon === 'new-client' ? 'rgba(255,255,255,0.25)' : 'transparent',
              transition: 'background-color 0.2s ease',
            }}
          >
            <img src="/assets/icons/glass/client-plus.svg" alt="Novo cliente" width={21} height={21} />
          </div>

          <div
            title="Criar coluna"
            onClick={() => handleOpenColumnModal()}
            onMouseEnter={() => setHoveredIcon('create-column')}
            onMouseLeave={() => setHoveredIcon(null)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 7,
              borderRadius: '50%',
              backgroundColor: hoveredIcon === 'create-column' ? 'rgba(255,255,255,0.35)' : 'transparent',
              transition: 'background-color 0.2s ease',
            }}
          >
            <img src="/assets/icons/glass/white-plus.svg" alt="Criar coluna" width={21} height={21} />
          </div>

          <Dropdown show={showFilterPanel} onToggle={(isOpen) => setShowFilterPanel(isOpen)}>
            <Dropdown.Toggle
              as="div"
              title="Filtrar cartões"
              onMouseEnter={() => setHoveredIcon('filter')}
              onMouseLeave={() => setHoveredIcon(null)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 7,
                borderRadius: '50%',
                backgroundColor: hoveredIcon === 'filter' ? 'rgba(255,255,255,0.25)' : 'transparent',
                transition: 'background-color 0.2s ease',
              }}
            >
              <img src="/assets/icons/glass/filers.svg" alt="Filtrar" width={21} height={21} />
            </Dropdown.Toggle>

            <Dropdown.Menu
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #dee2e6',
                borderRadius: 10,
                padding: '16px',
                minWidth: '320px',
                maxHeight: '400px',
                overflowY: 'auto',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                marginTop: 8,
              }}
            >
              <h5 style={{ fontSize: '1rem', fontWeight: 600, color: '#1c252e', textAlign: 'center', marginBottom: 20 }}>
                Filtro
              </h5>

              <div style={{ marginBottom: 12 }}>
                <h6 style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: 12 }}>
                  Etiquetas
                </h6>
                {labels.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: '#6c757d', margin: 0 }}>Nenhuma etiqueta disponível</p>
                ) : (
                  labels.map((label) => {
                    const isSelected = selectedLabels.includes(label.name);
                    return (
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
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleLabelFilter(label.name);
                          }}
                          style={{
                            marginRight: 8,
                            width: 15,
                            height: 15,
                            cursor: 'pointer',
                          }}
                        />
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLabelFilter(label.name);
                          }}
                          style={{
                            flex: 1,
                            height: 36,
                            backgroundColor: label.color,
                            color: label.text_color,
                            borderRadius: 4,
                            padding: '6px 12px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {label.name}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Row className="flex-nowrap" style={{ overflowX: 'auto', minHeight: '70vh' }}>
          {filteredColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onRename={(col) => handleOpenColumnModal(col)}
              onDelete={(col) => handleDeleteColumn(col)}
              onCardClick={handleCardClick}
              labels={labels}
            />
          ))}
        </Row>
      </DragDropContext>

      <ClientDetailsModal
        show={showDealModal}
        onHide={() => setShowDealModal(false)}
        deal={selectedDeal}
        onLabelsUpdated={reloadDeals}
        labels={labels}
        onLabelsChanged={() => { fetchLabels(); reloadDeals(); }}
      />

      <NewClientModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSubmit={handleCreateDeal}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
      />

      <ColumnModal
        show={showColumnModal}
        onHide={() => setShowColumnModal(false)}
        onSubmit={handleSaveColumn}
        columnFormData={columnFormData}
        setColumnFormData={setColumnFormData}
        saving={saving}
        editingColumn={!!editingColumn}
      />
    </Container>
  );
}
