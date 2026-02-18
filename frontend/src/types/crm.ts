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

export interface Label {
  id: number;
  name: string;
  color: string;
  text_color: string;
  position: number;
}