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
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthGate>
        </ConfigProvider>
      </HeroUIProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
