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
    icon: <Iconify icon="solar:widget-linear" />,
    bgcolor: '#2453dc',
  },
  {
    title: 'Clientes',
    path: '/clientes',
    icon: <Iconify icon="solar:user-outline" />,
    bgcolor: '#28b463',
  },
  {
    title: 'Pedidos',
    path: '/pedidos',
    icon: <Iconify icon="solar:sticker-square-outline" />,
    bgcolor: "#FFC300",
  },
  {
    title: 'Produtos',
    path: '/produtos',
    icon: <Iconify icon="solar:box-minimalistic-linear" />,
    bgcolor: '#9b1dda',
  },
  {
    title: 'Campanhas',
    path: '/campanhas',
    icon: <Iconify icon="solar:volume-loud-outline" />,
    bgcolor: '#f66c1d',
  },
];