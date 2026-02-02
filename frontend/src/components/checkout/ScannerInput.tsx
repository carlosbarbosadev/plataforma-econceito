import React, { useState } from 'react';

import { useCheckout } from '../../context/CheckoutContext';

const ScannerInput: React.FC = () => {
  const { processBarcode, selectedOrder } = useCheckout();

  const [qty, setQty] = useState<string>('1');
  const [code, setCode] = useState('');

  const totalItems = selectedOrder?.items.reduce((acc, item) => acc + item.quantityOrdered, 0) || 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (code.trim()) {
        processBarcode(code, Number(qty) || 1);
        setCode('');
        setQty('1');
      }
    }
  };

  const labelStyle = { fontSize: '0.75rem', marginBottom: '4px' };
  const inputStyle = { fontSize: '0.85rem' };

  return (
    <div className="w-100">
      {selectedOrder && (
        <div className="d-flex align-items-center mb-3">
          <h6 className="mb-0 fw-bold me-3" style={{ color: '#1f2a3b' }}>
            Pedido - {selectedOrder.orderNumber}
          </h6>

          <span
            className="badge rounded-pill"
            style={{
              backgroundColor:
                selectedOrder.statusId === 718171
                  ? '#72a59f'
                  : selectedOrder.statusId === 710186
                    ? '#64f2e1'
                    : '#fff1c7',
              color:
                selectedOrder.statusId === 718171
                  ? '#ffffff'
                  : selectedOrder.statusId === 710186
                    ? '#000029'
                    : '#833f12',
              fontSize: '0.7rem',
            }}
          >
            {selectedOrder.statusId === 718171
              ? 'Checkout incompleto'
              : selectedOrder.statusId === 710186
                ? 'Páscoa 2026'
                : 'Em aberto'}
          </span>
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-8 col-md-8">
          <label style={{ fontSize: '0.75rem' }} className="form-label text-secondary small mb-1">
            Cliente
          </label>
          <input
            disabled
            readOnly
            type="text"
            className="form-control bg-light text-dark"
            value={selectedOrder?.customerName || ''}
            style={{ cursor: 'default', fontSize: '0.9rem' }}
          />
        </div>

        <div className="col-4 col-md-4">
          <label style={{ fontSize: '0.75rem' }} className="form-label text-secondary small mb-1">
            Quantidade de itens
          </label>
          <input
            disabled
            readOnly
            type="text"
            className="form-control bg-light text-dark"
            value={totalItems.toFixed(2).replace('.', ',')}
            style={{ cursor: 'default', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-4 col-md-4 col-xl-2">
          <label style={{ fontSize: '0.75rem' }} className="form-label text-secondary small mb-1">
            Quantidade a ser conferida
          </label>
          <input
            style={{ fontSize: '0.9rem' }}
            type="text"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="form-control input-foco-azul"
            autoComplete="off"
          />
        </div>

        <div className="col-8 col-md-8 col-xl-10">
          <label style={{ fontSize: '0.75rem' }} className="form-label text-secondary small mb-1">
            Código do item
          </label>
          <input
            style={{ fontSize: '0.9rem' }}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="form-control input-foco-azul"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
};

export default ScannerInput;
