import Box from '@mui/material/Box';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  bgcolor?: string;
  info?: React.ReactNode;
};

export const navData: NavItem[] = [
  {
    title: 'Painel',
    path: '/',
    icon: <Iconify icon="uil:home-alt" sx={{ color: 'white' }} />,
    bgcolor: '#2453dc',
  },
  {
    title: 'Clientes',
    path: '/clientes',
    icon: <Iconify icon="uil:user" sx={{ color: 'white' }} />,
    bgcolor: '#28b463',
  },
  {
    title: 'Pedidos',
    path: '/pedidos',
    icon: <Iconify icon="mdi:file-document-box-multiple-outline" sx={{ color: 'white', width: '40', height: '40' }} />,
    bgcolor: "#FFC300",
  },
  {
    title: 'Produtos',
    path: '/produtos',
    icon: <Iconify icon="uil:archive-alt" sx={{ color: 'white' }} />,
    bgcolor: '#9b1dda',
  },
  {
    title: 'Campanhas',
    path: '/campanhas',
    icon: <Iconify icon="material-symbols:bid-landscape-outline" sx={{ color: 'white' }} />,
    bgcolor: '#f66c1d',
  },
];

export const logoutItem: NavItem = {
  title: 'Logout',
  path: '/login',
  icon: <Iconify icon="material-symbols:logout-rounded" sx={{ color: 'white' }} />,
  bgcolor: "#D32F2F",
};