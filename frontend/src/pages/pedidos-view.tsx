import { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Form, Badge } from 'react-bootstrap';
// Se configurou i18next
// import { useTranslation } from 'react-i18next'; 

import api from 'src/services/api';

type ClienteDoPedido = {
  id: number;
  nome: string;
  tipoPessoa?: string; 
  numeroDocumento?: string;
};

type Pedido = {
  id: number;
  numero: number | string; 
  data: string;           
  total: number;          
  contato: ClienteDoPedido; 
  situacao?: { 
    id: number; 
    valor?: number; 
    nome?: string;
  };
};

const mapSituacaoPedido = (idSituacao?: number): string => {
  if (idSituacao === undefined || idSituacao === null) return 'N/A';
  switch (idSituacao) {
    case 6: return 'Em Aberto';
    case 9: return 'Atendido';
    case 12: return 'Cancelado';
    // Adicionar aqui se eu descobrir mais IDs
    default: return `ID ${idSituacao}`;
  }
};

const getSituacaoBadgeVariant = (idSituacao?: number) : string => {
  if (idSituacao === undefined  || idSituacao === null) return 'secondary';
  switch (idSituacao) {
    case 6: return 'warning';
    case 9: return 'success';
    case 12: return 'danger';
    default: return 'secondary';
  }  
};

export default function PedidosView() {
  // Para i18n (descomente se estiver usando)
  // const { t } = useTranslation();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [searchTermPedidos, setSearchTermPedidos] = useState(''); // Se for adicionar busca

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    api.get<any>('/api/pedidos') 
      .then(res => {
        console.log('DEBUG: Dados recebidos de /api/pedidos:', res.data);
        const responseData = res.data; 

        if (Array.isArray(responseData)) {
          setPedidos(responseData as Pedido[]);
        } else {
          console.error('ERRO: /api/pedidos não retornou um array!', responseData);
          setError('Formato de dados de pedidos inesperado do servidor.');
          setPedidos([]); 
        }
      })
      .catch(err => {
        console.error('ERRO ao buscar pedidos:', err);
        const errorMessage = err.response?.data?.mensagem || err.message || 'Falha ao buscar dados dos pedidos.';
        setError(errorMessage);
        setPedidos([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []); 

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando Pedidos...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="mt-4">Erro ao carregar pedidos: {error}</Alert>;
  }

  const pageTitle = /* t ? t('ordersPage.title') : */ 'Meus Pedidos';
  // const searchPlaceholder = /* t ? t('ordersPage.searchPlaceholder') : */ 'Buscar pedidos...';
  // const headerId = /* t ? t('ordersTable.id') : */ 'ID Pedido'; // Removido
  const headerNumero = /* t ? t('ordersTable.number') : */ 'Número';
  const headerData = /* t ? t('ordersTable.date') : */ 'Data';
  const headerCliente = /* t ? t('ordersTable.client') : */ 'Cliente';
  const headerTotal = /* t ? t('ordersTable.total') : */ 'Total (R$)';
  const headerSituacao = /* t ? t('ordersTable.status') : */ 'Situação'; // Novo


  return (
    <div className="mt-4">
      <h2>{pageTitle}</h2>
      {/* <Form.Group className="mb-3">
        <Form.Control
          type="text"
          placeholder={searchPlaceholder}
          // value={searchTermPedidos}
          // onChange={(e) => setSearchTermPedidos(e.target.value)}
        />
      </Form.Group>
      */}

      {pedidos.length === 0 && !loading && (
        <Alert variant="info">Nenhum pedido para exibir no momento.</Alert>
      )}
      
      {pedidos.length > 0 && (
        <Table striped bordered hover responsive className="mt-3">
          <thead>
            <tr>
              {/* <th>{headerId}</th> Removido */}
              <th>{headerNumero}</th>
              <th>{headerData}</th>
              <th style={{ width: '70%' }}>{headerCliente}</th>
              <th>{headerTotal}</th>
              <th>{headerSituacao}</th> {/* Adicionado */}
            </tr>
          </thead>
          <tbody>
            {pedidos.map(pedido => (
              <tr key={pedido.id}> {/* Usar pedido.id como key ainda é fundamental */}
                {/* <td>{pedido.id}</td> Removido */}
                <td>{pedido.numero}</td>
                <td>{new Date(pedido.data).toLocaleDateString('pt-BR')}</td>
                <td>{pedido.contato.nome}</td>
                <td>{pedido.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <Badge
                    bg={getSituacaoBadgeVariant(pedido.situacao?.id)}
                    pill
                    style={{ fontSize: '0.85em', padding: '0.5em 0.75em' }}
                    >
                      {mapSituacaoPedido(pedido.situacao?.id)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
