import type { Breakpoint } from '@mui/material/styles';

import { merge } from 'es-toolkit';
import { useNavigate } from 'react-router-dom';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';

import { _notifications } from 'src/_mock';

import { layoutClasses } from '../core/classes';
import { _account } from '../nav-config-account';
import { dashboardLayoutVars } from './css-vars';
import { navData } from '../nav-config-dashboard';
import { MainSection } from '../core/main-section';
import { _workspaces } from '../nav-config-workspace';
import { MenuButton } from '../components/menu-button';
import { LayoutSection } from '../core/layout-section';
import { NavMobile, NavDesktop, NavLogout } from './nav';

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

  const handleLogout = () => {
    console.log('Executando logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigate('/sign-in');
  };

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

        <Tooltip title="Sair">
          <IconButton onClick={handleLogout} color="default">
            <LogoutIcon />
          </IconButton>
        </Tooltip>
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
          // A altura da AppBar é geralmente theme.mixins.toolbar.minHeight
          // ou um valor fixo como '64px' (desktop) ou '56px' (mobile).
          // Use o valor correto para a altura da sua AppBar.
          mt: `${theme.mixins.toolbar.minHeight || 64}px`,
          display: 'flex',
          flexDirection: 'column', // Para que LayoutSection se comporte como bloco
          // Opcional: para garantir que o conteúdo ocupe o restante da altura da viewport
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
                // Este seletor afeta o container principal ao lado da sidebar
                [theme.breakpoints.up(layoutQuery)]: {
                  pl: 'var(--layout-nav-vertical-width)', // Padding-left para a sidebar
                  transition: theme.transitions.create(['padding-left'], {
                    easing: 'var(--layout-transition-easing)',
                    duration: 'var(--layout-transition-duration)',
                  }),
                },
              },
            },
            ...(Array.isArray(sx) ? sx : [sx]), // Aqui ele mescla com o sx vindo das props do DashboardLayout
          ]}
        >
          {renderMain()}
        </LayoutSection>
      </Box>
    </>
  );
}
