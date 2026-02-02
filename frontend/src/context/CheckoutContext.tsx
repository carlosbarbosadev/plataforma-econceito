import { toast } from 'react-toastify';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import api from '../services/api';
import { Order, OrderItem } from '../types/checkout';

export type BlockingNotificationType = 'error' | 'warning';

export interface BlockingNotification {
  id: string;
  type: BlockingNotificationType;
  message: string;
  timestamp: number;
}

interface CheckoutContextData {
  orders: Order[];
  selectedOrder: Order | null;
  loading: boolean;
  savingMessage: string | null;
  error: string | null;
  blockingNotification: BlockingNotification | null;
  selectOrder: (id: string) => void;
  processBarcode: (code: string, qty?: number) => void;
  refreshOrders: () => Promise<void>;
  showBlockingNotification: (
    type: BlockingNotificationType,
    title: string,
    message: string
  ) => void;
  dismissBlockingNotification: () => void;
  savePartialOrder: () => Promise<void>;
  finalizeOrder: () => Promise<void>;
  createPendingBalance: () => Promise<void>;
}

const CheckoutContext = createContext<CheckoutContextData>({} as CheckoutContextData);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockingNotification, setBlockingNotification] = useState<BlockingNotification | null>(
    null
  );

  const showBlockingNotification = (type: BlockingNotificationType, message: string) => {
    setBlockingNotification({
      id: `notification-${Date.now()}`,
      type,
      message,
      timestamp: Date.now(),
    });
  };

  const dismissBlockingNotification = () => {
    setBlockingNotification(null);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/checkout/pedidos');
      const pedidos = response.data as Order[];
      setOrders(pedidos);
    } catch (err: any) {
      console.error('Erro ao buscar pedidos:', err);
      setError(err.response?.data?.mensagem || 'Falha ao buscar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const selectOrder = async (id: string) => {
    try {
      const response = await api.get(`/api/checkout/pedidos/${id}`);
      const pedidoAtualizado = response.data;
      setSelectedOrder(pedidoAtualizado);
    } catch (err: any) {
      console.error('Erro ao buscar pedido:', err);
      const order = orders.find((o) => o.id === id);
      if (order) setSelectedOrder(order);
    }
  };

  const processBarcode = async (code: string, qty: number = 1) => {
    if (blockingNotification) {
      console.log('Checkout bloqueado: há uma notificação pendente');
      return;
    }

    if (!selectedOrder) {
      console.log('Nenhum pedido selecionado');
      return;
    }

    const existingItem = selectedOrder.items.find((item) => item.sku === code || item.ean === code);

    if (existingItem) {
      const newQuantity = existingItem.quantityChecked + qty;
      if (newQuantity > existingItem.quantityOrdered) {
        showBlockingNotification('warning', `Produto ${code} já foi lido.`);
        return;
      }
    }

    try {
      const response = await api.post('/api/checkout/conferir', {
        orderId: selectedOrder.id,
        code,
        quantity: qty,
      });

      if (response.data.success) {
        const itemConferido = response.data.item;
        const scannedTimestamp = Date.now();

        setSelectedOrder((prev) => {
          if (!prev) return null;

          const updatedItems = prev.items.map((item) => {
            if (item.sku === itemConferido.sku) {
              const newChecked = item.quantityChecked + qty;
              return {
                ...item,
                quantityChecked: newChecked,
                status: newChecked >= item.quantityOrdered ? 'ok' : 'pending',
                lastScannedAt: scannedTimestamp,
              } as OrderItem;
            }
            return item;
          });

          return { ...prev, items: updatedItems };
        });

        setOrders((prev) =>
          prev.map((order) => {
            if (order.id === selectedOrder.id) {
              const updatedItems = order.items.map((item) => {
                if (item.sku === itemConferido.sku) {
                  const newChecked = item.quantityChecked + qty;
                  return {
                    ...item,
                    quantityChecked: newChecked,
                    status: newChecked >= item.quantityOrdered ? 'ok' : 'pending',
                    lastScannedAt: scannedTimestamp,
                  } as OrderItem;
                }
                return item;
              });
              return { ...order, items: updatedItems };
            }
            return order;
          })
        );

        console.log('Conferência registrada:', itemConferido);
      }
    } catch (err: any) {
      console.error('Erro na conferência:', err);
      showBlockingNotification('error', `Produto ${code} não encontrado`);
    }
  };

  const refreshOrders = async () => {
    await fetchOrders();
  };

  const savePartialOrder = async () => {
    if (!selectedOrder) return;

    try {
      setSavingMessage('Salvando o estado atual do pedido.');

      await api.post('/api/checkout/salvar-parcial', {
        orderId: selectedOrder.id,
        items: selectedOrder.items,
      });

      setSelectedOrder((prev) => (prev ? { ...prev, status: 'Checkout Parcial' } : null));

      toast.success('Progresso salvo com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar progresso.');
    } finally {
      setSavingMessage(null);
    }
  };

  const finalizeOrder = async () => {
    if (!selectedOrder) return;

    try {
      setSavingMessage('Finalizando checkout.');

      await api.post('/api/checkout/finalizar', {
        orderId: selectedOrder.id,
        items: selectedOrder.items,
      });

      setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id));

      setSelectedOrder(null);

      toast.success('Pedido finalizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao finalizar pedido.');
    } finally {
      setSavingMessage(null);
    }
  };

  const createPendingBalance = async () => {
    if (!selectedOrder) return;

    try {
      setSavingMessage('Criando saldo pendente...');

      const response = await api.post('/api/checkout/saldo-pendente', {
        orderId: selectedOrder.id,
      });

      if (response.data.success) {
        await selectOrder(selectedOrder.id);

        await refreshOrders();

        toast.success(
          `Saldo pendente criado! Novo pedido: ${response.data.novoPedido.numero || response.data.novoPedido.id}`
        );
      }
    } catch (err: any) {
      console.error('Erro ao criar saldo pendente:', err);
      toast.error(err.response?.data?.mensagem || 'Erro ao criar saldo pendente.');
    } finally {
      setSavingMessage(null);
    }
  };

  return (
    <CheckoutContext.Provider
      value={{
        orders,
        selectedOrder,
        loading,
        savingMessage,
        error,
        blockingNotification,
        selectOrder,
        processBarcode,
        refreshOrders,
        showBlockingNotification,
        dismissBlockingNotification,
        savePartialOrder,
        finalizeOrder,
        createPendingBalance,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckout = () => useContext(CheckoutContext);
