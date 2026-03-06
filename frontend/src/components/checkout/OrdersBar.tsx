import { FiSearch } from 'react-icons/fi';
import React, { useState, useRef, useEffect } from 'react';

import { useCheckout } from '../../context/CheckoutContext';

const OrdersBar: React.FC = () => {
  const { orders, selectedOrder, selectOrder } = useCheckout();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  const filteredOrders = orders.filter((order) =>
    order.orderNumber.includes(searchTerm)
  );

  return (
    <div className="d-flex align-items-center bg-white p-2 rounded w-100">
      <div
        className="d-flex gap-2 align-items-center"
        style={{
          whiteSpace: 'nowrap',
          overflowX: 'auto',
          flexWrap: 'nowrap',
        }}
      >
        <div
          className="flex-shrink-0 d-flex align-items-center"
          style={{
            marginRight: '4px',
            marginLeft: '10px',
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'width 0.25s ease',
            width: isSearchOpen ? '110px' : '24px',
          }}
        >
          <FiSearch
            style={{ color: '#6c757d', flexShrink: 0 }}
            size={16}
            onClick={() => {
              if (isSearchOpen && searchTerm === '') {
                setIsSearchOpen(false);
              } else {
                setIsSearchOpen(true);
              }
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onBlur={() => {
              if (searchTerm === '') setIsSearchOpen(false);
            }}
            style={{
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '0.8rem',
              width: isSearchOpen ? '80px' : '0px',
              marginLeft: isSearchOpen ? '4px' : '0px',
              padding: 0,
              transition: 'width 0.25s ease, margin-left 0.25s ease',
              color: '#1f2a3b',
            }}
          />
        </div>
        {filteredOrders.map((order) => {
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
                      : order.statusId === 722370
                        ? '#fde8e4'
                        : '#fff1c7',
                  color: isSelected
                    ? '#1f58cc'
                    : order.statusId === 718171
                      ? '#066da1'
                      : order.statusId === 722370
                        ? '#ef664e'
                        : '#713f12',
                }}
              >
                {isSelected
                  ? 'Em separação'
                  : order.statusId === 718171
                    ? 'Parcial'
                    : order.statusId === 722370
                      ? 'Pendente'
                      : 'Pronto'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersBar;
