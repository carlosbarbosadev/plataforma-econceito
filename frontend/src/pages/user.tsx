// src/pages/user.tsx
import { useEffect, useState } from 'react';

import { Table, Spinner, Alert } from 'react-bootstrap'; // ou use Bootstrap puro
import api from 'src/services/api';

type Cliente = { id: number; nome: string; email: string };

export default function ClientesPage() {
  const [data, setData] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Cliente[]>('/clientes')
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner animation="border" />;
  if (error)   return <Alert variant="danger">Erro: {error}</Alert>;

  return (
    <div className="mt-4">
      <h2>Clientes</h2>
      <Table striped bordered hover>
        <thead>
          <tr><th>ID</th><th>Nome</th><th>Email</th></tr>
        </thead>
        <tbody>
          {data.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td><td>{c.nome}</td><td>{c.email}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
