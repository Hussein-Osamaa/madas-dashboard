import { createBrowserRouter } from 'react-router-dom';
import AppShell from './shell/AppShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardHomePage from './pages/core/DashboardHomePage';
import LoginPage from './pages/core/LoginPage';
import NoAccessPage from './pages/core/NoAccessPage';
import NavigationPage from './pages/ecommerce/NavigationPage';
import CollectionsPage from './pages/inventory/CollectionsPage';
import LowStockPage from './pages/inventory/LowStockPage';
import InventoryLastPiecesPage from './pages/inventory/LastPiecesPage';
import { default as InventoryProductsPage } from './pages/inventory/ProductsPage';
import ProductDetailsPage from './pages/inventory/ProductDetailsPage';
import ReviewsPage from './pages/inventory/ReviewsPage';
import OrdersPage from './pages/orders/OrdersPage';
import ScanLogPage from './pages/orders/ScanLogPage';
import AbandonedCartsPage from './pages/orders/AbandonedCartsPage';
import OrderTrackingPage from './pages/orders/OrderTrackingPage';
import CustomersPage from './pages/customers/CustomersPage';
import OverviewPage from './pages/finance/OverviewPage';
import DepositsPage from './pages/finance/DepositsPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import BudgetsPage from './pages/finance/BudgetsPage';
import ReportsPage from './pages/finance/ReportsPage';
import CapitalPage from './pages/finance/CapitalPage';
import CashFlowPage from './pages/finance/CashFlowPage';
import ProfitSettlementPage from './pages/finance/ProfitSettlementPage';
import FinanceAnalyticsPage from './pages/finance/AnalyticsPage';
import MainSettingsPage from './pages/settings/SettingsPage';
import AnalyticsPage from './pages/settings/AnalyticsPage';
import ShippingPage from './pages/settings/ShippingPage';
import PaymentsPage from './pages/settings/PaymentsPage';
import POSPage from './pages/pos/POSPage';
import WebsiteBuilderPage from './pages/ecommerce/WebsiteBuilderPage';
import VisitStorePage from './pages/ecommerce/VisitStorePage';
import CustomDomainsPage from './pages/ecommerce/CustomDomainsPage';
import TemplatesPage from './pages/ecommerce/TemplatesPage';
import WebsiteSettingsPage from './pages/ecommerce/WebsiteSettingsPage';
import BuilderPage from './pages/ecommerce/BuilderPage';
import StorePreviewPage from './pages/ecommerce/StorePreviewPage';
import PublicWebsitePage from './pages/ecommerce/PublicWebsitePage';
import CodeEditorPage from './pages/ecommerce/CodeEditorPage';
import ProductsPage from './pages/ecommerce/ProductsPage';
import AboutPage from './pages/ecommerce/AboutPage';
import LastPiecesPage from './pages/ecommerce/LastPiecesPage';
import CartPage from './pages/ecommerce/CartPage';
import FavoritePage from './pages/ecommerce/FavoritePage';
import ProfilePage from './pages/ecommerce/ProfilePage';
import PublicLoginPage from './pages/ecommerce/LoginPage';
import RegisterPage from './pages/ecommerce/RegisterPage';
import RolesPage from './pages/rbac/RolesPage';
import UsersPage from './pages/rbac/UsersPage';
import SetupPasswordPage from './pages/auth/SetupPasswordPage';
import DiscountsPage from './pages/marketing/DiscountsPage';
import PricingPage from './pages/marketing/PricingPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      {
        index: true,
        element: <DashboardHomePage />
      },
      {
        path: 'orders',
        element: <OrdersPage />
      },
      {
        path: 'orders/scan-log',
        element: <ScanLogPage />
      },
      {
        path: 'orders/abandoned-carts',
        element: <AbandonedCartsPage />
      },
      {
        path: 'orders/tracking',
        element: <OrderTrackingPage />
      },
      {
        path: 'pos',
        element: <POSPage />
      },
      {
        path: 'customers',
        element: <CustomersPage />
      },
      {
        path: 'inventory/products',
        element: <InventoryProductsPage />
      },
      {
        path: 'inventory/products/:productId',
        element: <ProductDetailsPage />
      },
      {
        path: 'inventory/collections',
        element: <CollectionsPage />
      },
      {
        path: 'inventory/last-pieces',
        element: <InventoryLastPiecesPage />
      },
        {
          path: 'inventory/low-stock',
          element: <LowStockPage />
        },
        {
          path: 'inventory/reviews',
          element: <ReviewsPage />
        },
      {
        path: 'marketing/discounts',
        element: <DiscountsPage />
      },
      {
        path: 'marketing/pricing',
        element: <PricingPage />
      },
      {
        path: 'finance/overview',
        element: <OverviewPage />
      },
      {
        path: 'finance/deposits',
        element: <DepositsPage />
      },
      {
        path: 'finance/expenses',
        element: <ExpensesPage />
      },
      {
        path: 'finance/budgets',
        element: <BudgetsPage />
      },
      {
        path: 'finance/reports',
        element: <ReportsPage />
      },
      {
        path: 'finance/capital',
        element: <CapitalPage />
      },
      {
        path: 'finance/cash-flow',
        element: <CashFlowPage />
      },
      {
        path: 'finance/profit-settlement',
        element: <ProfitSettlementPage />
      },
      {
        path: 'finance/analytics',
        element: <FinanceAnalyticsPage />
      },
      {
        path: 'settings',
        element: <MainSettingsPage />
      },
      {
        path: 'settings/analytics',
        element: <AnalyticsPage />
      },
      {
        path: 'settings/shipping',
        element: <ShippingPage />
      },
      {
        path: 'settings/payments',
        element: <PaymentsPage />
      },
      {
        path: 'ecommerce/website-builder',
        element: <WebsiteBuilderPage />
      },
      {
        path: 'ecommerce/visit-store',
        element: <VisitStorePage />
      },
      {
        path: 'ecommerce/custom-domains',
        element: <CustomDomainsPage />
      },
      {
        path: 'ecommerce/templates',
        element: <TemplatesPage />
      },
      {
        path: 'ecommerce/website-settings',
        element: <WebsiteSettingsPage />
      },
      {
        path: 'ecommerce/navigation',
        element: <NavigationPage />
      },
      {
        path: 'ecommerce/code-editor',
        element: <CodeEditorPage />
      },
      {
        path: 'rbac/roles',
        element: <RolesPage />
      },
      {
        path: 'rbac/users',
        element: <UsersPage />
      },
    ]
  },
  {
    path: 'ecommerce/builder',
    element: <ProtectedRoute><BuilderPage /></ProtectedRoute>
  },
  {
    path: 'ecommerce/preview/:siteId',
    element: <ProtectedRoute><StorePreviewPage /></ProtectedRoute>
  },
  {
    path: 'site/:siteId',
    element: <PublicWebsitePage />
  },
  {
    path: 'site/:siteId/products',
    element: <ProductsPage />
  },
  {
    path: 'site/:siteId/last',
    element: <LastPiecesPage />
  },
  {
    path: 'site/:siteId/about',
    element: <AboutPage />
  },
  {
    path: 'site/:siteId/cart',
    element: <CartPage />
  },
  {
    path: 'site/:siteId/favorites',
    element: <FavoritePage />
  },
  {
    path: 'site/:siteId/profile',
    element: <ProfilePage />
  },
  {
    path: 'site/:siteId/login',
    element: <PublicLoginPage />
  },
  {
    path: 'site/:siteId/register',
    element: <RegisterPage />
  },
  {
    path: 's/:siteId',
    element: <PublicWebsitePage />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/setup-password',
    element: <SetupPasswordPage />
  },
  {
    path: '/no-access',
    element: <NoAccessPage />
  }
], {
  basename: '/dashboard',
  future: { v7_startTransition: true }
});

