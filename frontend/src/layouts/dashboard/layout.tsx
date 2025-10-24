import type { Breakpoint } from '@mui/material/styles';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Toolbar from '@mui/material/Toolbar';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { NavDesktop, NavMobile } from './nav';
import { layoutClasses } from '../core/classes';
import { dashboardLayoutVars } from './css-vars';
import { navData } from '../nav-config-dashboard';
import { MainSection } from '../core/main-section';
import { _workspaces } from '../nav-config-workspace';
import { MenuButton } from '../components/menu-button';
import { LayoutSection } from '../core/layout-section';

import type { MainSectionProps } from '../core/main-section';
import type { HeaderSectionProps } from '../core/header-section';
import type { LayoutSectionProps } from '../core/layout-section';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    main?: MainSectionProps;
  };
};

export function DashboardLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'lg',
}: DashboardLayoutProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { value: navOpen, onFalse: onNavClose, onTrue: onNavOpen } = useBoolean();

  const userDataString = localStorage.getItem('userData');
  const nomeCompleto = userDataString ? JSON.parse(userDataString).nome : '';
  const primeiroNome = nomeCompleto.split(' ')[0];

  const handleLogout = () => {
    console.log('Executando logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigate('/sign-in');
  };

  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const getInitials = (name: string) => (name ? name[0].toUpperCase() : '?');

  // Nova barra de pesquisa fixa no topo
  const renderFixedSearchAppBar = () => (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        backgroundColor: 'rgba(240, 240, 240, 0.95)',
        backdropFilter: 'blur(8px)',
        zIndex: theme.zIndex.drawer + 2,
        borderBottom: `2px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar>
        <MenuButton onClick={onNavOpen} sx={{ mr: 1, display: { [layoutQuery]: 'none' } }} />

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ flexShrink: 0 }}>
          <Tooltip title="">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }} disableRipple>
              <Avatar
                sx={{
                  bgcolor: '#bbbec5ff',
                  border: '2px solid',
                  borderColor: '#bbbec5ff',
                }}
              >
                {getInitials(primeiroNome)}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            sx={{
              mt: '45px',
              '& .MuiPaper-root': {
                minWidth: '220px',
                borderRadius: '4px',
              },
            }}
            id="menu-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle1" noWrap>
                {primeiroNome}
              </Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />

            <MenuItem onClick={handleCloseUserMenu}>
              <Typography textAlign="center">Meus dados</Typography>
            </MenuItem>

            <MenuItem
              onClick={() => {
                handleLogout();
                handleCloseUserMenu();
              }}
            >
              <Typography textAlign="center">Sair</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );

  const renderFooter = () => null;

  const renderMain = () => (
    <MainSection {...slotProps?.main}>
      <Container maxWidth="xl">{children}</Container>
    </MainSection>
  );

  return (
    <>
      {' '}
      {/* Fragmento para agrupar a nova AppBar e o LayoutSection */}
      {renderFixedSearchAppBar()} {/* Renderiza a nova barra de pesquisa no topo */}
      {/* Este Box envolve o restante do layout para aplicar a margem do topo */}
      <Box
        sx={{
          mt: `${theme.mixins.toolbar.minHeight || 64}px`,
          display: 'flex',
          flexDirection: 'column',
          minHeight: `calc(100vh - ${theme.mixins.toolbar.minHeight || 64}px)`,
        }}
      >
        <NavMobile open={navOpen} onClose={onNavClose} data={navData} workspaces={_workspaces} />
        <LayoutSection
          headerSection={null}
          sidebarSection={
            <NavDesktop data={navData} layoutQuery={layoutQuery} workspaces={_workspaces} />
          }
          footerSection={renderFooter()}
          cssVars={{ ...dashboardLayoutVars(theme), ...cssVars }}
          sx={[
            {
              [`& .${layoutClasses.sidebarContainer}`]: {
                [theme.breakpoints.up(layoutQuery)]: {
                  pl: 'var(--layout-nav-vertical-width)',
                  transition: theme.transitions.create(['padding-left'], {
                    easing: 'var(--layout-transition-easing)',
                    duration: 'var(--layout-transition-duration)',
                  }),
                },
              },
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          {renderMain()}
        </LayoutSection>
      </Box>
    </>
  );
}
