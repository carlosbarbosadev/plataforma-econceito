import { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Form } from 'react-bootstrap'; // ou use Bootstrap puro

import api from 'src/services/api';

type Cliente = { 
  id: number; 
  nome: string; 
  numeroDocumento?: string;
  telefone?: string
  celular?: string
};

export default function ClientesPage() {
  const [data, setData] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.get<Cliente[]>('/clientes')
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredClients = data.filter(client => {
    const searchTermLower = searchTerm.toLowerCase();

    return (
      client.nome.toLowerCase().includes(searchTermLower) ||
      (client.numeroDocumento && client.numeroDocumento.toLowerCase().includes(searchTermLower)) ||
      (client.telefone && client.telefone.includes(searchTermLower)) ||
      (client.celular && client.celular.includes(searchTermLower)) ||
      client.id.toString().includes(searchTermLower)
    );
  });

  if (loading) return <Spinner animation="border" />;
  if (error)   return <Alert variant="danger">Erro: {error}</Alert>;

  return (
    <div className="mt-4">
      <h2>Clientes</h2>
      <Form.Group className="mb-3">
        <Form.Control
        type="text"
        placeholder="Buscar por nome, ID, documento, telefone"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Form.Group>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Documento</th>
            <th>Telefone</th>
            <th>Celular</th>
            </tr>
        </thead>
        <tbody>
          {filteredClients.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.nome}</td>
              <td>{c.numeroDocumento || '-'}</td>
              <td>{c.telefone || '-'}</td> 
              <td>{c.celular|| '-'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
