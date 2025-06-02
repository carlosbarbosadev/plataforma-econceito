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
  endereco?: { geral?: { municipio?: string; } };
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
    if (!client || typeof client.nome !== 'string') {
        return false; 
    }
    const searchTermLower = searchTerm.toLowerCase();
    const cidade = client.endereco?.geral?.municipio;

    return (
      client.nome.toLowerCase().includes(searchTermLower) ||
      (client.numeroDocumento && typeof client.numeroDocumento === 'string' && client.numeroDocumento.toLowerCase().includes(searchTermLower)) ||
      (client.telefone && typeof client.telefone === 'string' && client.telefone.includes(searchTermLower)) ||
      (client.id && client.id.toString().toLowerCase().includes(searchTermLower)) ||
      (cidade && typeof cidade === 'string' && cidade.toLowerCase().includes(searchTermLower))
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
  const searchPlaceholder = /* t ? t('clientsPage.searchPlaceholder') : */ 'Pesquisar por código, nome, CPF ou CNPJ';
  const headerIdCliente = 'Código';
  const headerNome = /* t ? t('tableHeaders.name') : */ 'Nome';
  const headerCnpjCpf = /* t ? t('tableHeaders.document') : */ 'CNPJ/CPF';
  const headerCidade = /* t ? t('tableHeaders.cellphone') : */ 'Cidade';
  const headerTelefone = /* t ? t('tableHeaders.phone') : */ 'Telefone';

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
              <th style= {{ width: '10%' }}>{headerIdCliente}</th>
              <th style={{ width: '70%' }}>{headerNome}</th>
              <th style={{ width: '20%' }}>{headerCnpjCpf}</th>
              <th>{headerCidade}</th>
              <th>{headerTelefone}</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.nome}</td>
                <td>{c.numeroDocumento || '-'}</td>
                <td>{ '-' }</td>
                <td>{c.telefone || '-'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}