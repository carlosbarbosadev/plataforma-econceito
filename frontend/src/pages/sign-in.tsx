import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Para redirecionar após o login

// MUI Components
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack'; // Para espaçamento fácil
import Alert from '@mui/material/Alert'; // Para mostrar erros
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// No futuro, importaremos o serviço da API aqui
// import apiService from 'src/services/apiService'; // Exemplo

export default function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Previne o comportamento padrão do formulário HTML
    setError(null); // Limpa erros anteriores
    setLoading(true);

    console.log('Tentando fazer login com:', { email, password });

    try {
      // TODO (Para a próxima vez): Fazer a chamada à API aqui
      // const response = await apiService.post('/api/auth/login', { email, password });
      // const { token, usuario } = response.data;
      // console.log('Login bem-sucedido, token:', token, 'Usuário:', usuario);
      // localStorage.setItem('authToken', token); // Armazena o token
      // localStorage.setItem('userData', JSON.stringify(usuario)); // Armazena dados do usuário (opcional)
      // navigate('/dashboard'); // Ou para a página principal após o login

      // Por enquanto, vamos simular um sucesso ou erro para ver a UI
      if (email === "carlos@admin.com" && password === "senhaforte123") { // Use suas credenciais de teste
        alert('Simulação de Login BEM-SUCEDIDO! (Implementar chamada real à API)');
        // navigate('/dashboard'); // Descomente para testar o redirecionamento
      } else {
        setError('Simulação: Credenciais inválidas. (Implementar chamada real à API)');
      }

    } catch (apiError: any) {
      console.error('Erro na API de login:', apiError);
      setError(apiError.response?.data?.mensagem || apiError.message || 'Erro ao tentar fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs"> {/* 'xs' para um formulário de login estreito */}
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Entrar na Plataforma
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Endereço de Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Senha"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {error && (
              <Alert severity="error" sx={{ width: '100%', mt: 1 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}