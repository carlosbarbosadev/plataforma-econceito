import type { Breakpoint } from '@mui/material/styles';

import { merge } from 'es-toolkit';
import { useNavigate } from 'react-router-dom';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';

import { _notifications } from 'src/_mock';

import { Iconify } from 'src/components/iconify';

import { NavMobile, NavDesktop } from './nav';
import { layoutClasses } from '../core/classes';
import { _account } from '../nav-config-account';
import { dashboardLayoutVars } from './css-vars';
import { navData } from '../nav-config-dashboard';
import { MainSection } from '../core/main-section';
import { _workspaces } from '../nav-config-workspace';
import { MenuButton } from '../components/menu-button';
import { HeaderSection } from '../core/header-section';
import { LayoutSection } from '../core/layout-section';
import { AccountPopover } from '../components/account-popover';
import { NotificationsPopover } from '../components/notifications-popover';

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
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

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
      elevation={1}
      sx={{
        backgroundColor: 'rgba(240, 240, 240, 0.95)',
        backdropFilter: 'blur(8px)',
        zIndex: theme.zIndex.drawer + 2,
      }}
    >
      <Toolbar>
        <Box sx={{ width: 88 }} />
        <Box sx={{
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Pesquisar"
            sx={{
              width: '100%',
              maxWidth: '480px',
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: '8px',
                backgroundColor: theme.palette.mode === 'light'
                  ? 'rgba(255, 255, 255, 0.85)'
                  : 'rgba(50, 50, 50, 0.85)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderRadius: '8px',
                  },
              }
            }}
          />
        </Box>

        <Button
          onClick={handleLogout}
          aria-label="Sair"
          sx={{
            color: 'text.primary'
          }}
        >
          <Iconify icon="solar:logout-outline" width={24} />
        </Button>
      </Toolbar>
    </AppBar>
  );

  const renderFooter = () => null;

  const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;

  return (
    <> {/* Fragmento para agrupar a nova AppBar e o LayoutSection */}
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
          minHeight: `calc(100vh - ${theme.mixins.toolbar.minHeight || 64}px)` 
        }}
      >
        <LayoutSection
          headerSection={null}
          sidebarSection={
            <NavDesktop data={navData} layoutQuery={layoutQuery} workspaces={_workspaces} />
          }
          footerSection={renderFooter()}
          cssVars={{ ...dashboardLayoutVars(theme), ...cssVars }}
          sx={[
            {
              [`& .${layoutClasses.sidebarContainer}`]: { // Este seletor afeta o container principal ao lado da sidebar
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