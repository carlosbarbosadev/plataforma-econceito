import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import { useTheme } from '@mui/material/styles';
import ListItemButton from '@mui/material/ListItemButton';
import Drawer, { drawerClasses } from '@mui/material/Drawer';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import logoDaPlataforma from 'src/assets/stratto-logo.png';

import { Scrollbar } from 'src/components/scrollbar';

import { logoutItem } from '../nav-config-dashboard';

import type { NavItem } from '../nav-config-dashboard';
import type { WorkspacesPopoverProps } from '../components/workspaces-popover';

// ----------------------------------------------------------------------

export type NavContentProps = {
  data: NavItem[];
  slots?: {
    topArea?: React.ReactNode;
    bottomArea?: React.ReactNode;
  };
  workspaces: WorkspacesPopoverProps['data'];
  sx?: SxProps<Theme>;
};

export function NavDesktop({
  sx,
  data,
  slots,
  workspaces,
  layoutQuery,
}: NavContentProps & { layoutQuery: Breakpoint }) {
  const theme = useTheme();

  return (
    <Box
    component="nav"
    className="desktop-sidebar"
      sx={{
        bgcolor: "background.paper",
        pt: 2.5,
        px: 2.5,
        pb: 5,
        top: 0,
        left: 0,
        height: 1,
        display: 'none',
        position: 'fixed',
        flexDirection: 'column',
        zIndex: 'var(--layout-nav-zIndex)',
        width: 'var(--layout-nav-vertical-width)',
        borderRight: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
        boxShadow: `4px 0px 12px -2px ${varAlpha(theme.vars.palette.grey["600Channel"], 0.12)}`,
        [theme.breakpoints.up(layoutQuery)]: {
          display: 'flex',
        },
        ...sx,
      }}
    >
      <NavContent data={data} slots={slots} workspaces={workspaces} />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function NavMobile({
  sx,
  data,
  open,
  slots,
  onClose,
  workspaces,
}: NavContentProps & { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{
        [`& .${drawerClasses.paper}`]: {
          pt: 2.5,
          px: 2.5,
          overflow: 'unset',
          width: 'var(--layout-nav-mobile-width)',
          ...sx,
        },
      }}
    >
      <NavContent data={data} slots={slots} workspaces={workspaces} />
    </Drawer>
  );
}

// ----------------------------------------------------------------------

export function NavContent({ data, slots, workspaces, sx }: NavContentProps) {
  const pathname = usePathname();

  return (
    <>
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '40px' }}>
      <img
        src={logoDaPlataforma}
        alt="Logo da plataforma"
        style={{ height: "150px", display: 'block' }}
      />
    </div>

      {slots?.topArea}

      <Scrollbar fillContent>
        <Box
          component="nav"
          sx={[
            {
              display: 'flex',
              flex: '1 1 auto',
              flexDirection: 'column',
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          <Box
            component="ul"
            sx={{
              gap: 2,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {data.map((item) => {
              const isActived = item.path === pathname;

              return (
                <ListItem disableGutters disablePadding key={item.title}>
                  <ListItemButton
                    disableGutters
                    component={RouterLink}
                    href={item.path}
                    sx={[
                      (theme) => ({
                        pl: 2,
                        py: 1,
                        gap: 2,
                        pr: 1.5,
                        borderRadius: 0.75,
                        typography: 'body2',
                        minHeight: 44,
                        fontWeight: isActived ? 'fontWeightSemiBold' : 'fontWeightMedium',
                        // Letras cinza padrão, azul quando ativo
                        color: isActived ? '#1976d2' : '#b0b0b0',
                        backgroundColor: isActived ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                        ...(isActived && {
                          '&:hover': {
                            bgcolor: 'rgba(25, 118, 210, 0.15)',
                          },
                        }),
                        ...(!isActived && {
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.08)',
                          }
                        })
                      }),
                    ]}
                  >
                    <Box
                      component="span"
                      sx={{
                        width: 45,
                        height:45,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: "5px",
                        bgcolor: item.bgcolor,
                        color: "white",
                      }}
                    >
                      {item.icon}
                    </Box>

                    <Box component="span" sx={{ flexGrow: 1 }}>
                      {item.title}
                    </Box>

                    {item.info && item.info}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </Box>
        </Box>
      </Scrollbar>

      {slots?.bottomArea}

    </>
  );
}

// ----------------------------------------------------------------------

type NavLogoutProps = {
  onLogout: () => void;
};

export function NavLogout({ onLogout }: NavLogoutProps) {
return (
  <Box>
    <ListItem disableGutters disablePadding key ={logoutItem.title}>
      <ListItemButton
        disableGutters
        onClick={onLogout}
        sx={{
          pl: 2,
          py: 1,
          gap: 2,
          pr: 1.5,
          borderRadius: 0.75,
          typography: 'body2',
          minHeight: 44,
          fontWeight: 'fontWeightMedium',
          color: '#b0b0b0',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Box
          component="span"
          sx={{
            width: 45,
            height: 45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: "5px",
            bgcolor: logoutItem.bgcolor,
            color: "white",
          }}
        >
          {logoutItem.icon}
        </Box>
        <Box component="span" sx={{ flexGrow: 1 }}>
          {logoutItem.title}
        </Box>
      </ListItemButton>
    </ListItem>
  </Box>
  );
}