import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider, ToastProvider } from '@heroui/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthGate, ConfigProvider, ThemeProvider } from '@spookydecs/ui';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <HeroUIProvider>
        <ToastProvider placement="bottom-right" />
        <ConfigProvider>
          {/* admin is internal-staff only — gate render on token presence + env
              claim before mounting the app (shared AuthGate, #513). */}
          <AuthGate>
            {/* No basename: admin is served at the bare root (admin.spookydecs.com)
                with root-relative routes and no /admin prefix (bare-root standard,
                #487). Bare root renders the dashboard directly. */}
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthGate>
        </ConfigProvider>
      </HeroUIProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
