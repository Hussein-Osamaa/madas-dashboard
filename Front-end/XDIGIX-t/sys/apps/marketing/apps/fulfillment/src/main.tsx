import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { StaffAuthProvider } from './contexts/StaffAuthContext';
import { router } from './router';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <StaffAuthProvider>
        <RouterProvider router={router} />
      </StaffAuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
