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
  info?: React.ReactNode;
};

export const navData: NavItem[] = [
  {
    title: 'Painel',
    path: '/',
    icon: <Iconify icon="solar:widget-linear" />,
  },
  {
    title: 'Clientes',
    path: '/clientes',
    icon: <Iconify icon="solar:user-outline" />,
  },
  {
    title: 'Pedidos',
    path: '/pedidos',
    icon: <Iconify icon="solar:sticker-square-outline" />,
  },
  {
    title: 'Produtos',
    path: '/produtos',
    icon: <Iconify icon="solar:box-minimalistic-linear" />
  },
  {
    title: 'Campanhas',
    path: '/campanhas',
    icon: <Iconify icon="solar:volume-loud-outline" />,
  },
];