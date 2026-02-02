import React from 'react';

import CheckoutActions from './CheckoutActions';
import { useCheckout } from '../../context/CheckoutContext';

const ScannedList: React.FC = () => {
  const { selectedOrder } = useCheckout();

  const scannedItems = selectedOrder
    ? selectedOrder.items
      .filter((item) => item.quantityChecked > 0)
      .sort((a, b) => (b.lastScannedAt || 0) - (a.lastScannedAt || 0))
    : [];

  const totalChecked = selectedOrder
    ? selectedOrder.items.reduce((sum, item) => sum + item.quantityChecked, 0)
    : 0;
  const totalOrdered = selectedOrder
    ? selectedOrder.items.reduce((sum, item) => sum + item.quantityOrdered, 0)
    : 0;

  return (
    <div
      className="bg-white rounded-3 d-flex flex-column"
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      <div className="px-3 mt-3 flex-shrink-0">
        <span className="fw-bold" style={{ fontSize: '0.9rem', color: '#495769' }}>
          Produtos conferidos
        </span>
      </div>

      <div className="flex-grow-1 p-2" style={{ overflowY: 'auto', minHeight: 0 }}>
        <div className="d-flex flex-column gap-2">
          {scannedItems.map((item, index) => {
            const isComplete = item.quantityChecked >= item.quantityOrdered;

            return (
              <div
                key={index}
                className="card p-2 w-100"
                style={{
                  backgroundColor: isComplete ? '#eef9f3' : '#ffffff',
                  border: isComplete ? '1px solid #34ad61' : '1px solid #e9ecef',
                  borderRadius: '8px',
                  flexShrink: 0,
                }}
              >
                <div className="fw-bold" style={{ fontSize: '0.85rem', color: '#1f2a3b' }}>
                  {item.sku}
                </div>

                <div className="text-muted" style={{ fontSize: '0.7rem', wordWrap: 'break-word' }}>
                  {item.name}
                </div>

                <div
                  className="fw-bold mt-1"
                  style={{
                    fontSize: '0.85rem',

                    color: '#1f2a3b',
                  }}
                >
                  {item.quantityChecked.toFixed(2).replace('.', ',')}/
                  {item.quantityOrdered.toFixed(2).replace('.', ',')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3 mb-3 flex-shrink-0">
        <span className="mt-2 fw-bold" style={{ fontSize: '0.9rem', color: '#495769' }}>
          Conferidos{' '}
          <span style={{ fontSize: '0.9rem', color: '#495769' }}>
            {totalChecked.toFixed(2).replace('.', ',')} /{' '}
            {totalOrdered.toFixed(2).replace('.', ',')}
          </span>
        </span>

        <CheckoutActions />
      </div>
    </div>
  );
};

export default ScannedList;
