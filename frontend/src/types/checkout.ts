export interface OrderItem {
  sku: string;
  ean: string;
  name: string;
  imageUrl?: string;
  quantityOrdered: number;
  quantityChecked: number;
  status: 'pending' | 'ok' | 'error';
  unitPrice?: number;
  stockAvailable?: number;
  lastScannedAt?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  statusId?: number;
  notes?: string;
  items: OrderItem[];
}