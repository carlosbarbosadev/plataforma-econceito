import React from 'react';

import { useCheckout } from '../../context/CheckoutContext';

const CheckoutActions: React.FC = () => {
  const { selectedOrder, savePartialOrder, finalizeOrder, createPendingBalance } = useCheckout();

  if (!selectedOrder) return null;

  const totalChecked = selectedOrder.items.reduce((acc, item) => acc + item.quantityChecked, 0);

  const isComplete = selectedOrder.items.every(
    (item) => item.quantityChecked >= item.quantityOrdered
  );

  const hasStarted = totalChecked > 0;

  const hasPendingItems = selectedOrder.items.some(
    (item) => item.quantityChecked < item.quantityOrdered
  );

  return (
    <div className="d-flex gap-2 w-100 justify-content-end">
      <button
        className="btn d-flex align-items-center justify-content-center text-white"
        onClick={createPendingBalance}
        disabled={!hasStarted || !hasPendingItems}
        style={{
          backgroundColor: '#f59e0b',
          borderColor: '#f59e0b',
          borderRadius: '6px',
          padding: '6px 20px',
          fontWeight: 500,
          fontSize: '0.85em',
        }}
      >
        S/ Pendente
      </button>

      {isComplete ? (
        <button
          className="btn d-flex align-items-center justify-content-center text-white"
          onClick={finalizeOrder}
          style={{
            backgroundColor: '#34ad61',
            borderColor: '#34ad61',
            borderRadius: '6px',
            padding: '6px 20px',
            fontWeight: 500,
            fontSize: '0.85em',
          }}
        >
          Finalizar
        </button>
      ) : (
        <button
          className="btn d-flex align-items-center justify-content-center text-white"
          onClick={savePartialOrder}
          disabled={!hasStarted}
          style={{
            backgroundColor: '#34ad61',
            borderColor: '#34ad61',
            borderRadius: '6px',
            padding: '6px 20px',
            fontWeight: 500,
            fontSize: '0.85em',
          }}
        >
          Salvar
        </button>
      )}
    </div>
  );
};

export default CheckoutActions;
