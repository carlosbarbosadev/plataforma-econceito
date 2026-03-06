import React from 'react';
import { FiUser } from 'react-icons/fi';
import { Spinner, Alert } from 'react-bootstrap';

import ScannedList from 'src/components/checkout/ScannedList';
import SavingOverlay from 'src/components/checkout/SavingOverlay';
import BlockingNotification from 'src/components/checkout/BlockingNotification';

import OrdersBar from '../../components/checkout/OrdersBar';
import ItemsTable from '../../components/checkout/ItemsTable';
import ScannerInput from '../../components/checkout/ScannerInput';
import OperatorSelector from '../../components/checkout/OperatorSelector';
import { CheckoutProvider, useCheckout } from '../../context/CheckoutContext';

const CheckoutContent: React.FC = () => {
  const { loading, error, selectedOperator, setOperator, clearOperator } = useCheckout();

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex justify-content-center align-items-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 bg-light d-flex justify-content-center align-items-center">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  if (!selectedOperator) {
    return (
      <div className="min-vh-100 bg-light">
        <OperatorSelector onSelect={setOperator} />
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light d-flex flex-column mt-5">
      <SavingOverlay />
      <BlockingNotification />

      <div className="container-fluid mb-4">
        <div className="d-flex justify-content-end mb-2">
          <div
            className="d-flex align-items-center gap-2"
            style={{
              backgroundColor: '#fff',
              borderRadius: '6px',
              padding: '12px 20px',
            }}
          >
            <img
              src="/assets/icons/glass/green-client.svg"
              alt=""
              style={{ width: '20px', height: '20px' }}
            />
            <span style={{ fontSize: '0.9rem', color: '#1f2a3b', fontWeight: 500 }}>
              {selectedOperator.nome}
            </span>
            <button
              onClick={clearOperator}
              className="btn btn-sm"
              style={{
                fontSize: '0.75rem',
                color: '#6c757d',
                padding: '2px 10px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                marginLeft: '4px',
              }}
            >
              Trocar
            </button>
          </div>
        </div>
        <OrdersBar />
      </div>

      <div className="container-fluid flex-grow-1 d-flex flex-column">
        <div className="bg-white rounded-3 p-4 mb-4">
          <ScannerInput />
        </div>

        <div className="row mb-4" style={{ height: '60vh', minHeight: '300px' }}>
          <div className="col-12 col-lg-9 h-100">
            <div className="bg-white rounded-3 overflow-hidden d-flex flex-column h-100">
              <div className="p-0 flex-grow-1 bg-white position-relative" style={{ minHeight: 0 }}>
                <div className="position-absolute w-100 h-100 overflow-auto">
                  <ItemsTable />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-3 h-100">
            <ScannedList />
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckoutPage: React.FC = () => (
  <CheckoutProvider>
    <title>Checkout - GoStratto</title>
    <CheckoutContent />
  </CheckoutProvider>
);

export default CheckoutPage;
