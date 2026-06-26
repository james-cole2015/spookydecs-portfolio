import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import { ConfigProvider, ThemeProvider } from '@spookydecs/ui';
import { SeasonProvider } from './season/SeasonProvider';
import App from './App';
import './index.css';

// Public/anonymous in v1: no auth bundle. ConfigProvider reads the public
// /admin/config (no token) so SpookyConfig is available for #365/#366 wiring.
// ThemeProvider owns .dark/.light; SeasonProvider owns data-season (the two compose).
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <HeroUIProvider>
        <ConfigProvider>
          <SeasonProvider>
            <App />
          </SeasonProvider>
        </ConfigProvider>
      </HeroUIProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
