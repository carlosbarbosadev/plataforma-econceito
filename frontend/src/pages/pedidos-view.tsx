import { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Form } from 'react-bootstrap'; 
// Se configurou i18next
// import { useTranslation } from 'react-i18next'; 

import api from 'src/services/api'; // Sua instância do axios

// Defina o tipo para um Pedido baseado no que vimos no JSON do Bling
type ClienteDoPedido = {
  id: number;
  nome: string;
  tipoPessoa?: string; // Vimos que isso vem no objeto contato do pedido
  numeroDocumento?: string;
};

type Pedido = {
  id: number;
  numero: number | string; // Numero do pedido pode ser string ou numero
  data: string;           // Data do pedido
  total: number;          // Valor total do pedido
  contato: ClienteDoPedido; // Informações do cliente dentro do pedido
  situacao?: { id: number, valor?: number, nome?: string }; // Situação do pedido (opcional para exibição)
  // Adicione outros campos do pedido que você queira exibir
};

export default function PedidosView() {
  // Para i18n (descomente se estiver usando)
  // const { t } = useTranslation();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Se quiser busca para pedidos também, pode adicionar searchTerm aqui

  useEffect(() => {
    setLoading(true);
    setError(null);

    api.get<any>('/api/pedidos') // Chama a rota de pedidos do seu backend
      .then(res => {
        console.log('DEBUG: Dados recebidos de /api/pedidos:', res.data);

        const responseData = res.data; // O backend deve retornar o array de pedidos

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
  }, []); // Roda uma vez ao montar o componente

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

  // Textos (podem vir da função t() do i18next)
  const pageTitle = /* t ? t('ordersPage.title') : */ 'Meus Pedidos';
  // const searchPlaceholder = /* t ? t('ordersPage.searchPlaceholder') : */ 'Buscar pedidos...';
  const headerId = /* t ? t('ordersTable.id') : */ 'ID Pedido';
  const headerNumero = /* t ? t('ordersTable.number') : */ 'Número';
  const headerData = /* t ? t('ordersTable.date') : */ 'Data';
  const headerCliente = /* t ? t('ordersTable.client') : */ 'Cliente';
  const headerTotal = /* t ? t('ordersTable.total') : */ 'Total (R$)';


  return (
    <div className="mt-4">
      <h2>{pageTitle}</h2>
      {/* Se quiser adicionar busca para pedidos no futuro:
      <Form.Group className="mb-3">
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
              <th>{headerId}</th>
              <th>{headerNumero}</th>
              <th>{headerData}</th>
              <th>{headerCliente}</th>
              <th>{headerTotal}</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map(pedido => (
              <tr key={pedido.id}>
                <td>{pedido.id}</td>
                <td>{pedido.numero}</td>
                <td>{new Date(pedido.data).toLocaleDateString('pt-BR')}</td> {/* Formata a data */}
                <td>{pedido.contato.nome}</td>
                <td>{pedido.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td> {/* Formata como moeda */}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}