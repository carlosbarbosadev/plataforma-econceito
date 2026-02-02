import React from 'react';
import { Spinner } from 'react-bootstrap';

import { useCheckout } from '../../context/CheckoutContext';

const SavingOverlay: React.FC = () => {
  const { savingMessage } = useCheckout();

  if (!savingMessage) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '13px 17px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Spinner
          animation="border"
          style={{ color: '#495769', width: '1.5rem', height: '1.5rem' }}
        />
        <span style={{ fontSize: '0.95rem', color: '#495769' }}>{savingMessage}</span>
      </div>
    </div>
  );
};

export default SavingOverlay;
