import Select from 'react-select';
import { Trash } from 'react-bootstrap-icons';
import { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Spinner, Alert, Form, Button, Pagination, Stack, Table, Badge} from 'react-bootstrap';

import api from 'src/services/api';

type Produto = {
  id: number;
  nome: string;
  codigo?: string;
  preco?: number;
  estoque?: {
    saldoVirtualTotal?: number;
  };
  situacao?: string;
  imagemURL?: string;
  imagem_url?: string;
};

type ItemPedido = {
  idProduto: number;
  nomeProduto: string;
  codigoProduto?: string;
  quantidade: number | string;
  valorUnitario: number;
};

type ClienteParaSelecao = {
  id: number;
  nome: string;
  numeroDocumento?: string;
  tipoPessoa?: string;
};

type FormaPagamento = {
  id: number;
  descricao: string;
};

export default function ProductsPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [errorProdutos, setErrorProdutos] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [itensDoPedidoAtual, setItensDoPedidoAtual] = useState<ItemPedido[]>([]);
  
  const [listaDeClientes, setListaDeClientes] = useState<ClienteParaSelecao[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true); 
  const [errorClientes, setErrorClientes] = useState<string | null>(null); 
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const [listaFormasPagamento, setListaFormasPagamento] = useState<FormaPagamento[]>([]);
  const [loadingFormasPagamento, setLoadingFormasPagamento] = useState(true);
  const [errorFormasPagamento, setErrorFormasPagamento] = useState<string | null>(null);
  const [selectedFormaPagamentoId, setSelectedFormaPagamentoId] = useState<string>('');
  
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState('');
  const [quantidadesParaAdicionar, setQuantidadesParaAdicionar] = useState<Record<string, number | string>>({});

  // Buscar Clientes
  useEffect(() => {
    setLoadingClientes(true);
    setErrorClientes(null);
    api.get<ClienteParaSelecao[]>('/api/clientes')
      .then(response => {
        console.log('PRODUTOS_PAGE: Clientes recebidos para seleção:', response.data);
        if (Array.isArray(response.data)) {
          setListaDeClientes(response.data);
        } else {
          console.error("PRODUTOS_PAGE ERRO: /api/clientes não retornou um array para o seletor!", response.data);
          setListaDeClientes([]);
          setErrorClientes("Erro ao carregar lista de clientes para seleção.");
        }
      })
      .catch(err => {
        console.error("PRODUTOS_PAGE ERRO ao buscar clientes para seleção:", err);
        setErrorClientes(err.response?.data?.mensagem || err.message || "Falha ao buscar clientes para seleção.");
        setListaDeClientes([]);
      })
      .finally(() => setLoadingClientes(false));
  }, []);

  // Buscar formas de pagamento
  useEffect(() => {
    if (!loadingClientes && !errorClientes) {
      setLoadingFormasPagamento(true);
      setErrorFormasPagamento(null);
      api.get<FormaPagamento[]>('/api/utils/formas-pagamento')
        .then(response => {
          console.log('PRODUTOS_PAGE: Formas de Pagamento recebidas:', response.data);
          if (Array.isArray(response.data)) {
            setListaFormasPagamento(response.data);
          } else {
            console.error("PRODUTOS_PAGE ERRO: /api/utils/formas-pagamento não retornou um array!", response.data);
            setListaFormasPagamento([]);
            setErrorFormasPagamento("Erro ao carregar formas de pagamento.");
          }
        })
        .catch(err => {
          console.error("PRODUTOS_PAGE ERRO ao buscar formas de pagamento:", err);
          setErrorFormasPagamento(err.response?.data?.mensagem || err.message || "Falha ao buscar formas de pagamento.");
          setListaFormasPagamento([]);
        })
        .finally(() => setLoadingFormasPagamento(false));
    }
  }, [loadingClientes, errorClientes]);

  // Buscar produtos
  useEffect(() => {
    setLoadingProdutos(true);
    setErrorProdutos(null);

    const params = {
      page: currentPage,
      search: submittedSearchTerm,
    };

    api.get("/api/produtos", { params })
      .then(res => {
        const { data, total } = res.data;
        if (Array.isArray(data)) {
          setProdutos(data);
          const ITEMS_PER_PAGE = 100;
          if (total) {
            setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
          } else {
            setTotalPages(data.length < ITEMS_PER_PAGE ? currentPage : currentPage + 1);
          }
        } else {
          setErrorProdutos("Formato de dados inesperado.")
        }
      })
      .catch(err => {
        setErrorProdutos(err.response?.data?.mensagem || "Falha ao buscar produtos.");
      })
      .finally(() => {
        setLoadingProdutos(false);
      });
  }, [currentPage, submittedSearchTerm]);

  const optionsClientes = useMemo(() => 
    listaDeClientes.map(cliente => ({
      value: cliente.id.toString(),
      label: cliente.nome
    })), 
    [listaDeClientes]);

  const optionsFormasPagamento = useMemo(() =>
    listaFormasPagamento.map(forma => ({
      value: forma.id.toString(),
      label: forma.descricao
    })),
    [listaFormasPagamento])

  const handleClienteSelectChange = (selectedOptions: any) => {
    setSelectedClientId(selectedOptions ? selectedOptions.value : '');
  };

  const handleFormaPagamentoSelectChange = (selectedOptions: any) => {
    setSelectedFormaPagamentoId(selectedOptions ? selectedOptions.value : '');
  };

  const handleTabelaQuantidadeChange = (idProduto: number, quantidade: string) => {
    setQuantidadesParaAdicionar(prevState => ({
      ...prevState,
      [idProduto]: quantidade
    }));
  };

  const handleTabelaQuantidadeBlur = (idProduto: number, quantidade: string) => {
    if (quantidade === '') {
      setQuantidadesParaAdicionar(prevState => {
        const newState = { ...prevState};
        delete newState[idProduto];
        return newState;
      });
      return;
    }
    const quantidadeFinal = Math.max(1, parseInt(quantidade, 10) || 1);
    setQuantidadesParaAdicionar(prevState => ({
      ...prevState,
      [idProduto]: quantidadeFinal
    }));
  };

  const handleQuantidadeChange = (idProduto: number, quantidade: string) => {
    const novaQuantidade = Math.max(0, parseInt(quantidade, 10) || 0);

    setQuantidadesParaAdicionar(prevState => ({
      ...prevState,
      [idProduto]: novaQuantidade
    }));
  };

  const handleAdicionarAoPedido = (produtoParaAdicionar: Produto) => {
    if (!produtoParaAdicionar.id || produtoParaAdicionar.preco === undefined) {
      alert('Não é possivel adicionar este produto ao pedido (faltam dados).');
      return;
    }

    const quantidadeInput = quantidadesParaAdicionar[produtoParaAdicionar.id] || 1;
    const quantidade = Number(quantidadeInput);

    if (quantidade <= 0) {
      alert('Por favor, informe uma quantidade maior que zero.');
      return;
    }

    setItensDoPedidoAtual(itensAnteriores => {
      const itemExistente = itensAnteriores.find(item => item.idProduto === produtoParaAdicionar.id);
      if (itemExistente) {
        return itensAnteriores.map(item =>
          item.idProduto === produtoParaAdicionar.id
            ? { ...item, quantidade: Number(item.quantidade) + quantidade }
            : item
        );
      } else {
        return [
          ...itensAnteriores,
          {
            idProduto: produtoParaAdicionar.id,
            nomeProduto: produtoParaAdicionar.nome,
            codigoProduto: produtoParaAdicionar.codigo,
            quantidade: quantidade,
            valorUnitario: produtoParaAdicionar.preco!
          }
        ];
      }
    });

    setQuantidadesParaAdicionar(prevState => {
      const newState = { ...prevState };
      delete newState[produtoParaAdicionar.id];
      return newState;
    });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(1);
    setSubmittedSearchTerm(searchTerm);
  };

  const handleFinalizarPedido = async () => {
    if (!selectedClientId) {
      alert('Por favor, selecione um cliente para o pedido.');
      return;
    }
    if (!selectedFormaPagamentoId) {
      alert('Por favor, selecione uma forma de pagamento para o pedido.');
      return;
    }
    if (itensDoPedidoAtual.length === 0) {
      alert('Adicione pelo menos um produto ao pedido.');
      return;
    }
    
    setSubmittingOrder(true);
    // setError(null);

    const valorTotalDoPedido = itensDoPedidoAtual.reduce((acc, item) => acc + (Number(item.quantidade) * item.valorUnitario), 0);

    const payloadPedido = {
      idClienteBling: Number(selectedClientId),
      itensPedido: itensDoPedidoAtual.map(item => {
        const produtoOriginal = produtos.find(p => p.id === item.idProduto);
        return {
          idProdutoBling: item.idProduto,
          quantidade: Number(item.quantidade),
          valorUnitario: item.valorUnitario,
          codigo: produtoOriginal?.codigo || undefined,
          descricao: produtoOriginal?.nome || item.nomeProduto,
        };
      }),
      idFormaPagamentoBling: Number(selectedFormaPagamentoId),
      valorTotalPedido: valorTotalDoPedido,
      observacoes: "Pedido gerado pela plataforma de vendas."
    };

    try {
      console.log('Enviando payload do pedido para /api/pedidos:', JSON.stringify(payloadPedido, null, 2));
      const response = await api.post('/api/pedidos', payloadPedido);
      
      console.log('Pedido criado com sucesso!', response.data);
      alert(`Pedido criado com sucesso no Bling! Número do Pedido: ${response.data.data?.numero || response.data.data?.id || 'Verifique no Bling'}`);

      setItensDoPedidoAtual([]);
      setSelectedClientId('');
      setSelectedFormaPagamentoId('');
      setSearchTerm('');

    } catch (apiError: any) {
      console.error('Erro ao finalizar o pedido:', apiError);
      const errorMessage = apiError.response?.data?.mensagem || apiError.message || 'Falha ao criar o pedido. Tente novamente.';
      alert(`Erro ao criar pedido: ${errorMessage}`);
      // setErrorProdutos(errorMessage);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handlePredefinedSearch = (term: string) => {
    setSearchTerm(term);
    setSubmittedSearchTerm(term);
    setCurrentPage(1);
  };

  const handleCancelarPedido = () => {
    console.log("Pedido em montagem cancelado. Limpando estados...");
    setItensDoPedidoAtual([]);
    setSelectedClientId('');
    setSelectedFormaPagamentoId('');
    setSearchTerm('');
  };

  const handleRemoverItemDoPedido = (idProdutoParaRemover: number) => {
    setItensDoPedidoAtual(itensAnteriores =>
      itensAnteriores.filter(item => item.idProduto !== idProdutoParaRemover)
    );
  };

  const handleAtualizarQuantidade = (idProduto: number, novaQuantidade: string) => {
    setItensDoPedidoAtual(itensAnteriores => 
      itensAnteriores.map(item =>
        item.idProduto === idProduto ? { ...item, quantidade: novaQuantidade } : item
      )
    )
  };

  const handleQuantidadeBlur = (idProduto: number, quantidadeAtual: number | string) => {
    const quantidadeFinal = Math.max(1, parseInt(String(quantidadeAtual), 10) || 1);

    setItensDoPedidoAtual(itensAnteriores =>
      itensAnteriores.map(item =>
        item.idProduto === idProduto ? { ...item, quantidade: quantidadeFinal } : item
      )
    );
  };

  const pageTitle = 'Produtos';
  const searchPlaceholder = 'Buscar produtos por nome ou código';
  const noProductsMsg = 'Nenhum produto para exibir no momento.';
  const noProductsSearchMsg = (term: string) => `Nenhum produto encontrado para "${term}".`;

  if (loadingClientes || loadingFormasPagamento || loadingProdutos) { 
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando Dados da Página...</span>
        </Spinner>
      </Container>
    );
  }

  if (errorClientes || errorFormasPagamento || errorProdutos) { 
    return (
      <Container className="mt-4">
        {errorClientes && <Alert variant="warning">Erro ao carregar clientes: {errorClientes}</Alert>}
        {errorFormasPagamento && <Alert variant="warning" className="mt-2">Erro ao carregar formas de pagamento: {errorFormasPagamento}</Alert>}
        {errorProdutos && <Alert variant="danger" className="mt-2">Erro ao carregar produtos: {errorProdutos}</Alert>}
      </Container>
    );
  }

  return (
    <Container fluid className="mb-4">
      <div className="mt-5 mb-4" style={{ background: 'linear-gradient(135deg, #2453dc 0%, #577CFF 100%)', color: '#fff', padding: '25px', borderRadius: '16px', maxWidth: '250px', display: 'flex', justifyContent: 'center' }}>
        <h3 className="fw-bold mb-0" style={{ color: '#fff', marginBottom: '0' }}>
          {pageTitle}
        </h3>
      </div>
      <p className="fs-5 fw-bold">
        Criar pedido
      </p>
    <Row>
      <Col md={5}>
      <Form.Group className="mb-3" controlId="selecionarCliente">
        <Select
          options={optionsClientes}
          value={optionsClientes.find(option => option.value === selectedClientId)}
          onChange={handleClienteSelectChange}
          placeholder="Selecione ou digite para buscar um cliente"
          isLoading={loadingClientes}
          isClearable
          noOptionsMessage={() => "Nenhum cliente encontrado."}
          classNamePrefix="select-padrao"
        />
        {listaDeClientes.length === 0 && !loadingClientes && !errorClientes && (
            <Form.Text className="text-muted">Nenhum cliente encontrado para este vendedor.</Form.Text>
        )}
      </Form.Group>
      </Col>
    </Row>

    <Row>
      <Col md={5}>
      <Form.Group controlId="selecionarFormaPagamento">
        <Select
          options={optionsFormasPagamento}
          value={optionsFormasPagamento.find(option => option.value === selectedFormaPagamentoId)}
          onChange={handleFormaPagamentoSelectChange}
          placeholder="Selecione uma forma de pagamento"
          isLoading={loadingFormasPagamento}
          isClearable
          isSearchable={false}
          noOptionsMessage={() => "Nenhuma forma de pagamento encontrada."}
          classNamePrefix="select-padrao"
          isDisabled={!selectedClientId}
        />
      </Form.Group>
      </Col>
    </Row>

  <Stack direction="horizontal" gap={2} className="mt-5 mb-5">
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Kraft")}>Kraft</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Branca")}>Branca</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Cake Board")}>Cake Board</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Cake Box")}>Cake Box</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Presente")}>Presente</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Oitavada")}>Oitavada</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Sacola")}>Sacola</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Forminha")}>Forminha</Button>
    <Button variant="outline-secondary" size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("Tag")}>Tag</Button>
    <Button style={{backgroundColor: '#DC3545', borderColor: '#DC3545', color: '#ffffff'}} size="sm" className="flex-fill" onClick={() => handlePredefinedSearch("")}>Limpar busca</Button>
  </Stack>

      {itensDoPedidoAtual.length > 0 && selectedClientId && selectedFormaPagamentoId && (
        <Alert variant="light" className="mb-4 mt-4 pedido-atual-painel">
          <h5><strong>Pedido atual ({itensDoPedidoAtual.length} itens)</strong></h5>
          <ul className="list-unstyled mb-0">
            {itensDoPedidoAtual.map(item => (
              <li
                key={item.idProduto}
                className="d-flex align-items-center mb-1 pe-1"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5tem', width: '100%' }}>
                  <Form.Control
                    type="number"
                    className="input-foco-verde"
                    value={item.quantidade}
                    onChange={(e) => handleAtualizarQuantidade(item.idProduto, e.target.value)}

                    onBlur={(e) => handleQuantidadeBlur(item.idProduto, e.target.value)}
                    style={{ width: '65px', textAlign: 'center' }}
                    min={1}
                    size='sm'
                  />

                  <div className="d-flex flex-column ms-2">
                    <span>
                      {item.nomeProduto} - <strong>{(Number(item.quantidade) * item.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                      <Button
                        variant="link"
                        className="p-0 text-danger ms-2"
                        onClick={() => handleRemoverItemDoPedido(item.idProduto)}
                        title="Remover item"
                      >
                        <Trash size={16} />
                      </Button>
                    </span>
                    <small className="text-muted">Código: {item.codigoProduto || '--' }</small>
                  </div>
                </span>
              </li>
            ))}
          </ul>
          <p><strong>Total: R$ {itensDoPedidoAtual.reduce((acc, item) => acc + (Number(item.quantidade) * item.valorUnitario), 0).toFixed(2)}</strong></p>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button
              variant="secondary"
              onClick={handleCancelarPedido}
            >
              Cancelar
            </Button>

            <Button
              variant="primary"
              onClick={handleFinalizarPedido}
              disabled={submittingOrder || itensDoPedidoAtual.length === 0 || !selectedClientId || !selectedFormaPagamentoId}
            >
              {submittingOrder ? "Enviando Pedido..." : "Finalizar pedido"}
            </Button>
          </div>
        </Alert>
      )}
      
      {!errorProdutos && (
        <>
          {produtos.length === 0 && !loadingProdutos && (
            <Alert variant="info" className="mt-3">
              {searchTerm ? noProductsSearchMsg(searchTerm) : noProductsMsg}
            </Alert>
          )}
          
          {produtos.length > 0 && !loadingProdutos && (
            <Table hover responsive className=" align-middle">
              <thead>
                <tr>
                  <th className="fw-normal text-muted" style={{ fontSize: "0.8em" }}>Imagem</th>
                  <th className="fw-normal text-muted" style={{ width: "35%", fontSize: "0.8em" }}>Descrição</th>
                  <th className="fw-normal text-muted" style={{  width: "11%", fontSize: "0.8em" }}>Código</th>
                  <th className="fw-normal text-muted" style={{ width: "11%", fontSize: "0.8em" }}>Preço</th>
                  <th className="fw-normal text-muted" style={{ width: "15%", fontSize: "0.8em" }}>Estoque</th>
                  <th className="fw-normal text-muted" style={{ width: "5%", fontSize: "0.8em" }}>Quantidade</th>
                  <th className="fw-normal text-muted"> </th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(produto => {
                  console.log('Dados do produto sendo renderizado:', produto);

                  return (
                  <tr key={produto.id}>
                    <td>
                      <img
                        src={produto.imagemURL || produto.imagem_url || "/img/placeholder-produto.png"}
                        alt={produto.nome}
                        style={{ width: "57px", height: "57px", objectFit: "cover", borderRadius: "0.375rem" }}
                        onError={(e) => { (e.target as HTMLImageElement).src = "/img/placeholder-produto.png"; }}
                      />
                    </td>

                    <td style={{ fontSize: '0.9em' }}>{produto.nome}</td>
                    <td style={{ fontSize: '0.9em' }}>{produto.codigo || '-'}</td>
                    <td style={{ fontSize: '0.9em' }}>
                      {typeof produto.preco === "number"
                        ? produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : '-'}
                    </td>

                    <td style={{ fontSize: '0.9em' }}>
                      {(produto.estoque?.saldoVirtualTotal ?? 0) > 0 ? (
                        <Badge
                          bg="success-subtle"
                          text="success-emphasis"
                          pill
                          >
                            Disponível
                          </Badge>
                      ) : (
                        <Badge
                          bg="danger-subtle"
                          text="danger-emphasis"
                          pill
                        >
                          Indisponível
                        </Badge>
                      )}
                    </td>

                    <td>
                      <Form.Control
                        type="number"
                        size="sm"
                        className="input-foco-verde"
                        style={{ width: '65px', textAlign: 'center' }}
                        placeholder="1"
                        value={quantidadesParaAdicionar[produto.id] || ''}
                        onChange={(e) => handleTabelaQuantidadeChange(produto.id, e.target.value)}
                        onBlur={(e) => handleTabelaQuantidadeBlur(produto.id, e.target.value)}
                        min={1}
                      />
                    </td>
                    
                    <td className="text-end">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleAdicionarAoPedido(produto)}
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.2rem 0.75rem',
                          backgroundColor: '#4CAF50',
                          borderColor: '#4CAF50',
                        }}
                      >
                        Adicionar ao pedido
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </Table>
          )}

          <div className="rodape-busca-fixo">
            <Container>
              <Row className="justify-content-center">
                <Col md={8}>
                  <Form onSubmit={handleSearchSubmit}>
                  <Form.Group className="mb-0">
                    <Form.Control
                      style={{ borderRadius: '4px' }}
                      className="input-foco-azul rounded-3"
                      type="text"
                      placeholder='Buscar produtos por nome ou código'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={loadingProdutos}
                    />
                  </Form.Group>
                  </Form>
                </Col>
              </Row>
            </Container>
          </div>

          {(!loadingProdutos && (produtos.length > 0 || currentPage > 1)) && (
            <div className="d-flex justify-content-end mt-4">
              <Pagination>
                <Pagination.Prev
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 1}
                />
                <Pagination.Item disabled>{`Página ${currentPage}`}</Pagination.Item>
                <Pagination.Next
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={produtos.length < 100}
                />
              </Pagination>
            </div>
          )}

        </>
      )}
      {/* Mensagem se cliente ou forma de pagamento não selecionados e produtos não estão carregando */}
    </Container>
  );
}