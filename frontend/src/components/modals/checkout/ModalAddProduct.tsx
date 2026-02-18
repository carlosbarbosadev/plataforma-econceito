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

type ModalAddProductProps = {
    show: boolean;
    onHide: () => void;
    orderId: string;
    onAddSuccess: () => void;
};

export default function ModalAddProduct({
    show,
    onHide,
    orderId,
    onAddSuccess,
}: ModalAddProductProps) {
    const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
    const [newQuantity, setNewQuantity] = useState<number>(1);
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

    const handleConfirmAdd = async () => {
        if (!selectedProduct) return;

        setLoading(true);
        setError(null);

        try {
            await api.post('/api/checkout/adicionar-produto', {
                orderId,
                newProductSku: selectedProduct.codigo,
                newQuantity,
            });

            onAddSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Erro ao adicionar produto:', err);
            setError(err.response?.data?.mensagem || 'Falha ao adicionar produto. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedProduct(null);
        setNewQuantity(1);
        setError(null);
        onHide();
    };

    const formatCurrency = (value: number) =>
        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <Modal show={show} onHide={handleClose} dialogClassName="meu-modal-custom7" centered>
            <Modal.Header closeButton>
                <Modal.Title>Adicionar Produto</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {selectedProduct && (
                    <div
                        className="mb-3 p-3"
                        style={{ backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9' }}
                    >
                        <p className="mb-1 text-muted" style={{ fontSize: '0.85rem' }}>
                            Produto selecionado
                        </p>
                        <p className="mb-1 fw-bold" style={{ fontSize: '0.95rem', color: '#1f2a3b' }}>
                            {selectedProduct.nome}
                        </p>
                        <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '0.85rem' }}>
                            <div className="d-flex gap-3 align-items-center">
                                <span>SKU: {selectedProduct.codigo}</span>
                                <div className="d-flex align-items-center gap-2">
                                    <span>Quantidade:</span>
                                    <Form.Control
                                        type="number"
                                        min={1}
                                        value={newQuantity}
                                        onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="input-foco-verde"
                                        style={{ width: '60px', padding: '2px 8px', fontSize: '0.85rem', borderRadius: '5px' }}
                                    />
                                </div>
                            </div>
                            <span>{formatCurrency(selectedProduct.preco)}</span>
                        </div>
                    </div>
                )}

                <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: '0.8rem' }}>Buscar produto</Form.Label>
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
                    onClick={handleConfirmAdd}
                    disabled={!selectedProduct || loading}
                >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Adicionar'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
