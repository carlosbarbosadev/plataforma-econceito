import React, { useState } from 'react';
import { Table } from 'react-bootstrap';
import { FiImage } from 'react-icons/fi';

import api from '../../services/api';
import { OrderItem } from '../../types/checkout';
import { useCheckout } from '../../context/CheckoutContext';
import ModalReplaceProduct from '../modals/checkout/ModalReplaceProduct';

const ItemsTable: React.FC = () => {
  const { selectedOrder, processBarcode, selectOrder } = useCheckout();

  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [itemToReplace, setItemToReplace] = useState<OrderItem | null>(null);

  const pendingItems = selectedOrder
    ? selectedOrder.items.filter((item) => item.quantityChecked < item.quantityOrdered)
    : [];

  const headerStyle = {
    backgroundColor: '#e4e9f0',
    color: '#495769',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    verticalAlign: 'middle' as const,
  };

  const handleOpenReplaceModal = (item: OrderItem) => {
    setItemToReplace(item);
    setShowReplaceModal(true);
  };

  const handleReplaceSuccess = async () => {
    if (selectedOrder) {
      try {
        await api.post('/api/checkout/salvar-parcial', {
          orderId: selectedOrder.id,
          items: selectedOrder.items,
        });
      } catch (err) {
        console.error('Erro ao salvar progresso antes da substituição:', err);
      }
      selectOrder(selectedOrder.id);
    }
  };

  return (
    <>
      <div className="table-responsive h-100">
        <Table className="align-middle mb-0" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky-top" style={{ zIndex: 1 }}>
            <tr>
              <th className="ps-4 py-1" style={{ ...headerStyle, width: '50%' }}>
                Produto
              </th>
              <th className="py-1 text-center" style={{ ...headerStyle, width: '15%' }}>
                Conferidos
              </th>
              <th className="py-1 text-center" style={{ ...headerStyle, width: '20%' }}>
                Total
              </th>
              <th className="pe-4 py-1 text-center" style={{ ...headerStyle, width: '15%' }}>
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {pendingItems.map((item, index) => (
              <tr key={index} className="border-bottom">
                <td className="ps-4 py-3">
                  <div className="d-flex align-items-center">
                    <div
                      className="border rounded d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                      style={{ width: '50px', height: '50px', backgroundColor: '#fff' }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '4px',
                          }}
                        />
                      ) : (
                        <FiImage className="text-muted" size={24} />
                      )}
                    </div>

                    <div style={{ lineHeight: '1.4', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: '#495769',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#495769' }}>Sku: {item.sku}</div>
                      <div className="fw-bold" style={{ fontSize: '0.9rem', color: '#495769' }}>
                        {item.ean || 'GTIN não informado'}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="text-center fw-bold" style={{ fontSize: '0.9rem', color: '#495769' }}>
                  {item.quantityChecked.toFixed(2).replace('.', ',')}
                </td>

                <td className="text-center fw-bold" style={{ fontSize: '0.9rem', color: '#495769' }}>
                  {item.quantityOrdered.toFixed(2).replace('.', ',')}
                </td>

                <td className="pe-4 text-center">
                  <div className="d-flex justify-content-center gap-2">
                    <button
                      type="button"
                      style={{
                        backgroundColor: '#fff',
                        border: '1px solid #ccd5e0',
                        borderRadius: '8px',
                        padding: '6px 9px',
                      }}
                      title="Conferir manualmente"
                      onClick={() => processBarcode(item.ean || item.sku, 1)}
                    >
                      <img
                        src="/assets/icons/glass/check.svg"
                        alt="Conferir"
                        style={{ width: '20px', height: '20px' }}
                      />
                    </button>
                    <button
                      type="button"
                      style={{
                        backgroundColor: '#fff',
                        border: '1px solid #ccd5e0',
                        borderRadius: '8px',
                        padding: '6px 9px',
                      }}
                      title="Substituir produto"
                      onClick={() => handleOpenReplaceModal(item)}
                    >
                      <img
                        src="/assets/icons/glass/rotate.svg"
                        alt="Substituir"
                        style={{ width: '20px', height: '20px' }}
                      />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <ModalReplaceProduct
        show={showReplaceModal}
        onHide={() => setShowReplaceModal(false)}
        orderId={selectedOrder?.id || ''}
        currentProduct={
          itemToReplace
            ? {
              sku: itemToReplace.sku,
              name: itemToReplace.name,
              quantityOrdered: itemToReplace.quantityOrdered,
              unitPrice: itemToReplace.unitPrice || 0,
            }
            : null
        }
        onReplaceSuccess={handleReplaceSuccess}
      />
    </>
  );
};

export default ItemsTable;

