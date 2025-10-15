import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from './providers/ToastProvider';
import { UserProvider } from './providers/UserProvider';
import { SessionExpiredListener } from './components/SessionExpiredListener';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <UserProvider>
        <div className="app-shell">
          <SessionExpiredListener />
          <RouterProvider router={router} />
        </div>
      </UserProvider>
    </ToastProvider>
  </React.StrictMode>
);
