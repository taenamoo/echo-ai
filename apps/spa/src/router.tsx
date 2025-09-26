import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Home from './routes/Home';
import Login from './routes/Login';
import Signup from './routes/Signup';
import Logout from './routes/Logout';
import Documents from './routes/Documents';
import DocumentDetail from './routes/DocumentDetail';
import Study from './routes/Study';

function isAuthed() {
  return !!localStorage.getItem('accessToken');
}

function Protected({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/auth/login', element: <Login /> },
  { path: '/auth/signup', element: <Signup /> },
  { path: '/auth/logout', element: <Logout /> },
  { path: '/documents', element: (
      <Protected>
        <Documents />
      </Protected>
    ) },
  { path: '/documents/:id', element: (
      <Protected>
        <DocumentDetail />
      </Protected>
    ) },
  { path: '/study', element: (
      <Protected>
        <Study />
      </Protected>
    ) },
]);
