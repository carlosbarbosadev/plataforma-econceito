import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

// MUI Components
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack'; // Para espaçamento fácil
import Alert from '@mui/material/Alert'; // Para mostrar erros
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import InputAdornment from '@mui/material/InputAdornment';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import api from 'src/services/api';

export default function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    console.log('Tentando fazer login com:', { email, password });

    try {
      // Faz a chamada POST para a API de login do backend
      // A URL '/api/auth/login' será redirecionada pelo proxy para http://localhost:3001/api/auth/login
      const response =  await api.post('/api/auth/login', {
        email: email,
        senha: password,
      });

      const { token, usuario } = response.data;

      console.log('Login bem-sucedido');
      console.log('Token JWT:', token );
      console.log('Dados do usuário', usuario);

      localStorage.setItem('authToken', token);
      if (usuario) {
        localStorage.setItem('userData', JSON.stringify(usuario));
      }
      // Redirecionar para o dashboard/tela principal após o login
      // Certifique-se de que a rota 'dashboard' existe no seu frontend
      navigate('/');

    } catch (apiError: any) {
      console.error('Erro ao tentar fazer login:', apiError);
      setError(apiError.response?.data?.mensagem || apiError.message || 'Nome de usuário ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

    const handleTogglePasswordVisibility = () => {
      setShowPassword((show) => !show);
      passwordInputRef.current?.blur();
    };
  
    return (
      <Container component="main" maxWidth="xs"> {/* 'xs' para um formulário de login estreito */}
      <Box
        sx={{
            marginTop: 0,
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <img
            src="/src/assets/stratto-logo-2.png"
            alt="Logo da plataforma"
            style={{
              width: "240px",
              display: "block",
              marginLeft: "auto",
              marginRight: "auto"
            }}
          />

          <Typography component="h1" variant="h5" className='text-center' marginBottom={5}>
            Acesse sua conta
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
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                inputRef={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment  position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
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
                sx={{ 
                  mt: 3,
                  mb: 2,
                  backgroundColor: '#2979ff',
                  borderRadius: '20px',
                  '&:hover': {
                  backgroundColor: '#1E60DA',
                  },
                }}
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </Stack>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" align="center" sx={{mt: 8, mb: 4 }}>
          © 2025 - Embalagens Conceito.
          <br />
          Todos os direitos reservados.
        </Typography>
      </Container>
  );
}