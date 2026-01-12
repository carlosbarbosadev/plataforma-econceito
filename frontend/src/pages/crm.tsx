import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Container, Row, Col, Form, Button, Spinner } from 'react-bootstrap';

import api from '../services/api';
import { Column, ColumnConfig, Deal } from '../types/crm';
import KanbanColumn from '../components/crm/KanbanColumn';
import ColumnModal from '../components/modals/crm/ColumnModal';
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
  const [formData, setFormData] = useState({ client_name: '', client_email: '' });
  const [columnFormData, setColumnFormData] = useState({ title: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);

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

  const filteredColumns = columns.map((col) => ({
    ...col,
    deals: col.deals.filter(
      (deal) =>
        deal.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (deal.client_email && deal.client_email.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
  }));

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

  const loadData = useCallback(async () => {
    setLoading(true);
    const colsConfig = await fetchColumns();
    await fetchDeals(colsConfig);
    setLoading(false);
  }, [fetchColumns, fetchDeals]);

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

    const [movedDeal] = sourceCol.deals.splice(source.index, 1);

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
      await api.put(`/api/crm/deals/${movedDeal.client_id}/move`, {
        column_status: destination.droppableId,
        position: destination.index,
      });
    } catch (error) {
      console.error('Erro ao mover card:', error);
      setColumns(previousColumns);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_name.trim()) return;

    try {
      setSaving(true);
      await api.post('/api/crm/deals', {
        client_name: formData.client_name,
        client_email: formData.client_email,
      });
      setShowModal(false);
      setFormData({ client_name: '', client_email: '' });
      loadData();
    } catch (error) {
      console.error('Erro ao criar deal:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenColumnModal = (column?: ColumnConfig) => {
    if (column) {
      setEditingColumn(column);
      setColumnFormData({ title: column.title });
    } else {
      setEditingColumn(null);
      setColumnFormData({ title: '' });
    }
    setShowColumnModal(true);
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
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
  };

  const handleDeleteColumn = async (column: ColumnConfig) => {
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
  };

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

  const reloadDeals = async () => {
    const colsConfig = await fetchColumns();
    await fetchDeals(colsConfig);
  };

  return (
    <Container
      fluid
      className="mt-4 d-flex flex-column"
      style={{ height: 'calc(102.1vh - 100px)' }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
        <h3 className="mb-0 fw-bold">CRM Vendas</h3>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <Form.Control
            className="input-foco-azul"
            type="text"
            placeholder="Pesquisar cliente"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '250px', borderRadius: '4px' }}
          />
          <Button className="save-button" onClick={() => setShowModal(true)}>
            Novo cliente
          </Button>
          <Button className="save-button" onClick={() => handleOpenColumnModal()}>
            Criar coluna
          </Button>
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
              onCardClick={(deal) => {
                setSelectedDeal(deal);
                setShowDealModal(true);
              }}
            />
          ))}
        </Row>
      </DragDropContext>

      <ClientDetailsModal
        show={showDealModal}
        onHide={() => setShowDealModal(false)}
        deal={selectedDeal}
        onLabelsUpdated={reloadDeals}
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
