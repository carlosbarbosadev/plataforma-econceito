export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  bgcolor?: string;
  info?: React.ReactNode;
  roles?: string[];
};

export const navData: NavItem[] = [
  {
    title: 'DASHBOARD',
    path: '/',
    icon: <img src="/assets/icons/glass/dashboard.svg" width="24" alt="Dashboard" />,
    bgcolor: '#2453dc',
  },
  {
    title: 'CLIENTES',
    path: '/clientes',
    icon: <img src="/assets/icons/glass/client.svg" width="24" alt="Clientes" />,
    bgcolor: '#28b463',
  },
  {
    title: 'PEDIDOS',
    path: '/pedidos',
    icon: <img src="/assets/icons/glass/orders.svg" width="24" alt="Pedidos" />,
    bgcolor: '#FFC300',
  },
  {
    title: 'PRODUTOS',
    path: '/produtos',
    icon: <img src="/assets/icons/glass/products.svg" width="24" alt="Produtos" />,
    bgcolor: '#9b1dda',
  },
  {
    title: 'EXPEDIÇÃO',
    path: '/expedicao',
    icon: <img src="/assets/icons/glass/shipment.svg" width="24" alt="Expedição" />,
    bgcolor: '#00BCD4',
    roles: ['admin'],
  },
  {
    title: 'CHECKOUT',
    path: '/checkout',
    icon: <img src="/assets/icons/glass/cart-check.svg" width="24" alt="Checkout" />,
    bgcolor: '#f66c1d',
    roles: ['admin'],
  },
];
