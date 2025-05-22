import type { Breakpoint } from '@mui/material/styles';

import { merge } from 'es-toolkit';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';

import { _notifications } from 'src/_mock';

import { NavMobile, NavDesktop } from './nav';
import { layoutClasses } from '../core/classes';
import { _account } from '../nav-config-account';
import { dashboardLayoutVars } from './css-vars';
import { navData } from '../nav-config-dashboard';
import { MainSection } from '../core/main-section'; // Searchbar existente no header
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
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean(); // Hook para o NavMobile

  // Nova barra de pesquisa fixa no topo
  const renderFixedSearchAppBar = () => (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{
        backgroundColor: 'rgba(240, 240, 240, 0.95)',
        backdropFilter: 'blur(8px)',
        zIndex: theme.zIndex.drawer + 2, // Acima da sidebar
      }}
    >
      <Toolbar sx={{ justifyContent: 'center' }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Pesquisar em toda a plataforma..." // Placeholder atualizado
          sx={{
            width: 'clamp(300px, 50%, 700px)',
            backgroundColor: theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(50, 50, 50, 0.7)',
            borderRadius: theme.shape.borderRadius,
            '& .MuiOutlinedInput-root': {
              borderRadius: theme.shape.borderRadius,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </Toolbar>
    </AppBar>
  );

  // Header original abaixo da nova barra de pesquisa
  const renderHeader = () => {
    const headerSlotProps: HeaderSectionProps['slotProps'] = {
      container: {
        maxWidth: false,
      },
    };

    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      leftArea: (
        <>
          <MenuButton
            onClick={onOpen}
            sx={{ mr: 1, ml: -1, [theme.breakpoints.up(layoutQuery)]: { display: 'none' } }}
          />
          <NavMobile data={navData} open={open} onClose={onClose} workspaces={_workspaces} />
        </>
      ),
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 0.75 } }}>
          <NotificationsPopover data={_notifications} />
          <AccountPopover data={_account} />
        </Box>
      ),
    };

    return (
      <HeaderSection
        disableElevation
        layoutQuery={layoutQuery}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={slotProps?.header?.sx}
      />
    );
  };

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
          headerSection={renderHeader()}
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