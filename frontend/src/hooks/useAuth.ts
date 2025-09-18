type User = {
  id: number;
  nome: string;
  tipo: 'admin' | 'vendedor';
};

export function useAuth() {
  const userDataString = localStorage.getItem('userData');

  if (!userDataString) {
    return { user: null, isAdmin: false };
  }

  try {
    const user: User = JSON.parse(userDataString);
    const isAdmin = user && user.tipo === 'admin';

    return { user, isAdmin }
  } catch (error) {
    console.error("Erro ao parsear dados do usuário:", error);
    return { user: null, isAdmin: false };
  }
}