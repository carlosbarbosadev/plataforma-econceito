import 'src/global.css';

import { useEffect } from 'react';

import Fab from '@mui/material/Fab';
import { CssBaseline } from '@mui/material';

import { usePathname } from 'src/routes/hooks';

import { ThemeProvider } from 'src/theme/theme-provider';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type AppProps = {
  children: React.ReactNode;
};

export default function App({ children }: AppProps) {
  useScrollToTop();

  return (
    <ThemeProvider>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

// ----------------------------------------------------------------------

function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
