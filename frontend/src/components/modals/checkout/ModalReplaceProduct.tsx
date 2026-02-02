import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';

import api from 'src/services/api';

type ProductOption = {
    value: string;
    label: string;
    codigo: string;
    nome: string;
    preco: number;
    estoque: number;
};

type CurrentProduct = {
    sku: string;
    name: string;
    quantityOrdered: number;
    unitPrice: number;
};

type ModalReplaceProductProps = {
    show: boolean;
    onHide: () => void;
    orderId: string;
    currentProduct: CurrentProduct | null;
    onReplaceSuccess: () => void;
};

export default function ModalReplaceProduct({
    show,
    onHide,
    orderId,
    currentProduct,
    onReplaceSuccess,
}: ModalReplaceProductProps) {
    const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadProductOptions = async (inputValue: string): Promise<ProductOption[]> => {
        if (inputValue.trim().length < 2) {
            return [];
        }

        try {
            const response = await api.get('/api/produtos/search', {
                params: { search: inputValue },
            });

            return response.data.map((produto: any) => ({
                value: produto.codigo,
                label: `${produto.codigo} - ${produto.nome}`,
                codigo: produto.codigo,
                nome: produto.nome,
                preco: produto.preco,
                estoque: produto.estoque,
            }));
        } catch (err) {
            console.error('Erro ao buscar produtos:', err);
            return [];
        }
    };

    const handleConfirmReplace = async () => {
        if (!selectedProduct || !currentProduct) return;

        setLoading(true);
        setError(null);

        try {
            await api.post('/api/checkout/substituir-produto', {
                orderId,
                oldSku: currentProduct.sku,
                newProductSku: selectedProduct.codigo,
            });

            onReplaceSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Erro ao substituir produto:', err);
            setError(err.response?.data?.mensagem || 'Falha ao substituir produto. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedProduct(null);
        setError(null);
        onHide();
    };

    const formatCurrency = (value: number) =>
        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <Modal show={show} onHide={handleClose} dialogClassName="meu-modal-custom7" centered>
            <Modal.Header closeButton>
                <Modal.Title>Substituir Produto</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {currentProduct && (
                    <div
                        className="mb-4 p-3"
                        style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}
                    >
                        <p className="mb-1 text-muted" style={{ fontSize: '0.85rem' }}>
                            Produto atual
                        </p>
                        <p className="mb-1 fw-bold" style={{ fontSize: '0.95rem', color: '#1f2a3b' }}>
                            {currentProduct.name}
                        </p>
                        <div className="d-flex justify-content-between" style={{ fontSize: '0.85rem' }}>
                            <div className="d-flex gap-3">
                                <span>SKU: {currentProduct.sku}</span>
                                <span>Quantidade: {currentProduct.quantityOrdered}</span>
                            </div>
                            <span>{formatCurrency(currentProduct.unitPrice)}</span>
                        </div>
                    </div>
                )}

                {selectedProduct && (
                    <p className="text-center text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                        será substituído por
                    </p>
                )}

                {selectedProduct && (
                    <div
                        className="p-3"
                        style={{ backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9' }}
                    >
                        <p className="mb-1 text-muted" style={{ fontSize: '0.85rem' }}>
                            Novo produto
                        </p>
                        <p className="mb-1 fw-bold" style={{ fontSize: '0.95rem', color: '#1f2a3b' }}>
                            {selectedProduct.nome}
                        </p>
                        <div className="d-flex justify-content-between" style={{ fontSize: '0.85rem' }}>
                            <div className="d-flex gap-3">
                                <span>SKU: {selectedProduct.codigo}</span>
                            </div>
                            <span>{formatCurrency(selectedProduct.preco)}</span>
                        </div>
                    </div>
                )}

                <Form.Group className="mt-3 mb-3">
                    <Form.Label style={{ fontSize: '0.8rem' }}>Buscar produto substituto</Form.Label>
                    <AsyncSelect
                        cacheOptions
                        loadOptions={loadProductOptions}
                        onChange={(option) => setSelectedProduct(option as ProductOption)}
                        value={null}
                        placeholder="Busque por código ou descrição"
                        noOptionsMessage={({ inputValue }) =>
                            inputValue.length < 2
                                ? 'Digite pelo menos 2 caracteres'
                                : 'Nenhum produto encontrado'
                        }
                        loadingMessage={() => 'Buscando...'}
                        isClearable
                        classNamePrefix="select-padrao"
                    />
                </Form.Group>

                {error && (
                    <Alert variant="danger" className="mt-3 mb-0">
                        {error}
                    </Alert>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button className="cancel-button" onClick={handleClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    className="save-button"
                    onClick={handleConfirmReplace}
                    disabled={!selectedProduct || loading}
                >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Confirmar'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
