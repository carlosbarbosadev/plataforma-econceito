import React from 'react';
import { Spinner, Alert } from 'react-bootstrap';

import ScannedList from 'src/components/checkout/ScannedList';
import SavingOverlay from 'src/components/checkout/SavingOverlay';
import BlockingNotification from 'src/components/checkout/BlockingNotification';

import OrdersBar from '../../components/checkout/OrdersBar';
import ItemsTable from '../../components/checkout/ItemsTable';
import ScannerInput from '../../components/checkout/ScannerInput';
import { CheckoutProvider, useCheckout } from '../../context/CheckoutContext';

const CheckoutContent: React.FC = () => {
  const { loading, error } = useCheckout();

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

  return (
    <div className="min-vh-100 bg-light d-flex flex-column mt-5">
      <SavingOverlay />
      <BlockingNotification />

      <div className="container-fluid mb-4">
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
    <CheckoutContent />
  </CheckoutProvider>
);

export default CheckoutPage;
