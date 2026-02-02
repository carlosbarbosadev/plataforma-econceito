import React from 'react';
import { FiShoppingBag } from 'react-icons/fi';

import { useCheckout } from '../../context/CheckoutContext';

const OrdersBar: React.FC = () => {
  const { orders, selectedOrder, selectOrder } = useCheckout();

  return (
    <div className="d-flex align-items-center bg-white p-2 rounded w-100">
      <div
        className="d-flex gap-2 align-items-center orders-bar-scroll"
        style={{
          whiteSpace: 'nowrap',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {orders.map((order) => {
          const isSelected = selectedOrder?.id === order.id;

          return (
            <div
              key={order.id}
              onClick={() => selectOrder(order.id)}
              className={`
                card px-1 text-center cursor-pointer transition-all flex-shrink-0
                ${!isSelected ? 'bg-white' : ''}
              `}
              style={{
                width: '110px',
                minWidth: '110px',
                minHeight: '75px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isSelected ? '#eef9f3' : '#ffffff',
                border: isSelected ? '1px solid #34ad61' : '1px solid #e9ecef',
                borderRadius: '8px',
              }}
            >
              {/* Número do Pedido */}
              <div className="fw-bold fs-6" style={{ color: '#1f2a3b' }}>
                {order.orderNumber}
              </div>

              {/* Badge de Status */}
              <span
                className="badge rounded-pill"
                style={{
                  fontSize: '0.7rem',
                  backgroundColor: isSelected
                    ? '#dceafe'
                    : order.statusId === 718171
                      ? '#def3fc'
                      : '#fff1c7',
                  color: isSelected ? '#1f58cc' : order.statusId === 718171 ? '#066da1' : '#713f12',
                }}
              >
                {isSelected ? 'Em separação' : order.statusId === 718171 ? 'Parcial' : 'Pronto'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersBar;
