import { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Form } from 'react-bootstrap';
// Se você configurou i18next e quer usar para os textos fixos:
// import { useTranslation } from 'react-i18next';

import api from 'src/services/api';

type Cliente = {
  id: number;
  nome: string;
  numeroDocumento?: string;
  telefone?: string;
  celular?: string;
};

export default function ClientesPage() {
  // Para i18n (descomente se estiver usando e configurado)
  // const { t } = useTranslation();

  const [data, setData] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true); // Inicia o carregamento
    setError(null);   // Limpa erros anteriores
    
    api.get<any>('/api/clientes') // Usamos <any> temporariamente para inspecionar a resposta
      .then(res => {
        console.log('DEBUG: Dados recebidos de /api/clientes:', res.data);

        const responseData = res.data; // O backend retorna o array diretamente

        if (Array.isArray(responseData)) {
          setData(responseData as Cliente[]); // Faz o cast para Cliente[] se for um array
        } else {
          // Se responseData não for um array, algo está errado com a resposta da API
          console.error('ERRO: /api/clientes não retornou um array!', responseData);
          setError('Formato de dados inesperado recebido do servidor.');
          setData([]); // Define data como um array vazio para evitar o erro no .filter()
        }
      })
      .catch(err => {
        console.error('ERRO ao buscar clientes:', err);
        // Tenta pegar uma mensagem mais específica do erro do Axios ou do backend
        const errorMessage = err.response?.data?.mensagem || err.message || 'Falha ao buscar dados dos clientes.';
        setError(errorMessage);
        setData([]); // Define data como um array vazio em caso de erro
      })
      .finally(() => {
        setLoading(false); // Finaliza o carregamento
      });
  }, []); // Array de dependências vazio, roda apenas uma vez quando o componente monta

  const filteredClients = data.filter(client => {
    // Adiciona uma verificação para garantir que 'client' e 'client.nome' existem e são do tipo esperado
    if (!client || typeof client.nome !== 'string') {
        return false; 
    }
    const searchTermLower = searchTerm.toLowerCase();

    return (
      client.nome.toLowerCase().includes(searchTermLower) ||
      (client.numeroDocumento && typeof client.numeroDocumento === 'string' && client.numeroDocumento.toLowerCase().includes(searchTermLower)) ||
      (client.telefone && typeof client.telefone === 'string' && client.telefone.includes(searchTermLower)) ||
      (client.celular && typeof client.celular === 'string' && client.celular.includes(searchTermLower)) ||
      (client.id && client.id.toString().toLowerCase().includes(searchTermLower)) // Garante que id existe e converte para string
    );
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="mt-4">Erro ao carregar clientes: {error}</Alert>;
  }

  // Textos (podem vir da função t() do i18next se você descomentar e configurar)
  const pageTitle = /* t ? t('clientsPage.title') : */ 'Clientes';
  const searchPlaceholder = /* t ? t('clientsPage.searchPlaceholder') : */ 'Buscar por nome, ID, documento, telefone...';
  const headerId = /* t ? t('tableHeaders.id') : */ 'ID';
  const headerName = /* t ? t('tableHeaders.name') : */ 'Nome';
  const headerDocument = /* t ? t('tableHeaders.document') : */ 'Documento';
  const headerPhone = /* t ? t('tableHeaders.phone') : */ 'Telefone';
  const headerCellphone = /* t ? t('tableHeaders.cellphone') : */ 'Celular';

  return (
    <div className="mt-4">
      <h2>{pageTitle}</h2>
      <Form.Group className="mb-3">
        <Form.Control
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Form.Group>

      {data.length === 0 && !loading && !error && (
        <Alert variant="info">Nenhum cliente para exibir no momento.</Alert>
      )}

      {filteredClients.length === 0 && data.length > 0 && searchTerm !== '' && (
        <Alert variant="info">{`Nenhum cliente encontrado para o termo "${searchTerm}".`}</Alert>
      )}
      
      {/* Só mostra a tabela se houver clientes após o filtro OU se não houver filtro e houver dados */}
      {/* Ou, mais simples: só mostra a tabela se houver dados, e o map cuida de não renderizar nada se filteredClients estiver vazio */}
      {data.length > 0 && (
        <Table striped bordered hover responsive className="mt-3">
          <thead>
            <tr>
              <th>{headerId}</th>
              <th>{headerName}</th>
              <th>{headerDocument}</th>
              <th>{headerPhone}</th>
              <th>{headerCellphone}</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.nome}</td>
                <td>{c.numeroDocumento || '-'}</td>
                <td>{c.telefone || '-'}</td>
                <td>{c.celular || '-'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}