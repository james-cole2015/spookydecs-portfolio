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
                and the routes carry the /admin prefix themselves (see App.tsx), so
                bare root falls through the catch-all to the dashboard. */}
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthGate>
        </ConfigProvider>
      </HeroUIProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
