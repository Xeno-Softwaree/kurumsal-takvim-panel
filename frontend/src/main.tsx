import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { LabelsProvider } from './labels/LabelsContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LabelsProvider>
          <App />
        </LabelsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

