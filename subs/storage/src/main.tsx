import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ConfigProvider } from '@spookydecs/ui';
import { ThemeProvider } from './providers/ThemeProvider';
import { ToastProvider } from './lib/toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <HeroUIProvider>
        <ToastProvider>
          <ConfigProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ConfigProvider>
        </ToastProvider>
      </HeroUIProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
