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
          <AuthGate>
            {/* No basename: tracker is served at the bare root
                (dev-tracker.spookydecs.com). The subdomain is the namespace, so a
                "/tracker" basename was redundant — and it rendered an empty tree at
                "/" because the basename gate rejects the path before any route,
                including the catch-all, can match (#385). */}
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthGate>
        </ConfigProvider>
      </HeroUIProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
