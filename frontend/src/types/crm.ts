export interface Deal {
  deal_id: string | null;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  column_status: string;
  position: number;
  labels?: string[];
  description?: string;
  created_at?: string;
  total_attachments?: number;
  total_comments?: number;
}

export interface ColumnConfig {
  id: number;
  title: string;
  color: string;
  position: number;
}

export interface Column extends ColumnConfig {
  deals: Deal[];
}

export const LABEL_COLORS: Record<string, { color: string; textColor: string }> = {
  'Urgente': { color: '#f87168', textColor: '#742b26' },
  'VIP': { color: '#eed12b', textColor: '#604b07' },
  'Novo': { color: '#4bce97', textColor: '#19533b' },
  'Aguardando': { color: '#fca700', textColor: '#6b3300' },
  'Follow-up': { color: '#c97cf4', textColor: '#522c67' },
};

export const LABELS = [
  { name: 'Urgente', color: '#f87168', textColor: '#742b26' },
  { name: 'VIP', color: '#eed12b', textColor: '#604b07' },
  { name: 'Novo', color: '#4bce97', textColor: '#19533b' },
  { name: 'Aguardando', color: '#fca700', textColor: '#6b3300' },
  { name: 'Follow-up', color: '#c97cf4', textColor: '#522c67' },
];