import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './shell/AppShell';
import OverviewPage from './sections/OverviewPage';
import TransactionsPage from './sections/TransactionsPage';
import PaymentsPage from './sections/PaymentsPage';
import ExpensesPage from './sections/ExpensesPage';
import AccountsPage from './sections/AccountsPage';
import BudgetsPage from './sections/BudgetsPage';
import ReportsPage from './sections/ReportsPage';
import TaxesPage from './sections/TaxesPage';
import CapitalPage from './sections/CapitalPage';
import SettingsPage from './sections/SettingsPage';
import AuditPage from './sections/AuditPage';
import LoginPage from './pages/LoginPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'taxes', element: <TaxesPage /> },
      { path: 'capital', element: <CapitalPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'audit', element: <AuditPage /> }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
], {
  basename: '/finance'
});

