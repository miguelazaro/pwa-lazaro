import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from './register-sw';

// Ocultamos el splash y mostramos el root
const rootEl = document.getElementById('root') as HTMLElement;
const splash = document.getElementById('splash');

if (splash) splash.classList.add('hide');
rootEl.classList.remove('hide');

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registra el Service Worker 
registerSW();
