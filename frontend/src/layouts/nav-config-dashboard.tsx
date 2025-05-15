import Box from '@mui/material/Box';

import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';


// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
};

export const navData: NavItem[] = [
  {
    title: 'Painel',
    path: '/',
    icon: (
      <Box
        sx={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'text.primary',
        }}
      />
    ),
  },
  {
    title: 'Clientes',
    path: '/clientes',
    icon: (
      <Box
        sx={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'text.primary',
        }}
      />
    ),
  },
  {
    title: 'Pedidos',
    path: '/pedidos',
    icon: (
      <Box
        sx={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'text.primary',
        }}
      />
    ),
  },
  {
    title: 'Produtos',
    path: '/produtos',
    icon: (
      <Box
        sx={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'text.primary',
        }}
      />
    ),
  },
  {
    title: 'Campanhas',
    path: '/campanhas',
    icon: (
      <Box
        sx={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'text.primary',
        }}
      />
    ),
  },
];