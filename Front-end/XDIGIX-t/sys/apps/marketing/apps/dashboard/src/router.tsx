import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppShell from './shell/AppShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import FullScreenLoader from './components/common/FullScreenLoader';

const Lazy = (factory: () => Promise<{ default: React.ComponentType }>) => {
  const Component = lazy(factory);
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Component />
    </Suspense>
  );
};

const DashboardHomePage = () => import('./pages/core/DashboardHomePage');
const LoginPage = () => import('./pages/core/LoginPage');
const NoAccessPage = () => import('./pages/core/NoAccessPage');
const ResetPasswordPage = () => import('./pages/core/ResetPasswordPage');
const SetupPasswordPage = () => import('./pages/auth/SetupPasswordPage');

const OrdersPage = () => import('./pages/orders/OrdersPage');
const ScanLogPage = () => import('./pages/orders/ScanLogPage');
const AbandonedCartsPage = () => import('./pages/orders/AbandonedCartsPage');
const OrderTrackingPage = () => import('./pages/orders/OrderTrackingPage');

const InventoryProductsPage = () => import('./pages/inventory/ProductsPage');
const ProductDetailsPage = () => import('./pages/inventory/ProductDetailsPage');
const CollectionsPage = () => import('./pages/inventory/CollectionsPage');
const LowStockPage = () => import('./pages/inventory/LowStockPage');
const InventoryLastPiecesPage = () => import('./pages/inventory/LastPiecesPage');
const ReviewsPage = () => import('./pages/inventory/ReviewsPage');

const CustomersPage = () => import('./pages/customers/CustomersPage');
const POSPage = () => import('./pages/pos/POSPage');

const OverviewPage = () => import('./pages/finance/OverviewPage');
const DepositsPage = () => import('./pages/finance/DepositsPage');
const ExpensesPage = () => import('./pages/finance/ExpensesPage');
const BudgetsPage = () => import('./pages/finance/BudgetsPage');
const ReportsPage = () => import('./pages/finance/ReportsPage');
const CapitalPage = () => import('./pages/finance/CapitalPage');
const CashFlowPage = () => import('./pages/finance/CashFlowPage');
const ProfitSettlementPage = () => import('./pages/finance/ProfitSettlementPage');
const FinanceAnalyticsPage = () => import('./pages/finance/AnalyticsPage');

const MainSettingsPage = () => import('./pages/settings/SettingsPage');
const AnalyticsPage = () => import('./pages/settings/AnalyticsPage');
const ShippingPage = () => import('./pages/settings/ShippingPage');
const PaymentsPage = () => import('./pages/settings/PaymentsPage');

const DiscountsPage = () => import('./pages/marketing/DiscountsPage');
const PricingPage = () => import('./pages/marketing/PricingPage');

const WebsiteBuilderPage = () => import('./pages/ecommerce/WebsiteBuilderPage');
const VisitStorePage = () => import('./pages/ecommerce/VisitStorePage');
const CustomDomainsPage = () => import('./pages/ecommerce/CustomDomainsPage');
const TemplatesPage = () => import('./pages/ecommerce/TemplatesPage');
const WebsiteSettingsPage = () => import('./pages/ecommerce/WebsiteSettingsPage');
const NavigationPage = () => import('./pages/ecommerce/NavigationPage');
const BuilderPage = () => import('./pages/ecommerce/BuilderPage');
const StorePreviewPage = () => import('./pages/ecommerce/StorePreviewPage');
const PublicWebsitePage = () => import('./pages/ecommerce/PublicWebsitePage');
const CodeEditorPage = () => import('./pages/ecommerce/CodeEditorPage');
const ExternalWebsitePage = () => import('./pages/ecommerce/ExternalWebsitePage');
const ProductsPage = () => import('./pages/ecommerce/ProductsPage');
const AboutPage = () => import('./pages/ecommerce/AboutPage');
const LastPiecesPage = () => import('./pages/ecommerce/LastPiecesPage');
const CartPage = () => import('./pages/ecommerce/CartPage');
const FavoritePage = () => import('./pages/ecommerce/FavoritePage');
const ProfilePage = () => import('./pages/ecommerce/ProfilePage');
const PublicLoginPage = () => import('./pages/ecommerce/LoginPage');
const RegisterPage = () => import('./pages/ecommerce/RegisterPage');

const RolesPage = () => import('./pages/rbac/RolesPage');
const UsersPage = () => import('./pages/rbac/UsersPage');

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: Lazy(DashboardHomePage) },
      { path: 'orders', element: Lazy(OrdersPage) },
      { path: 'orders/scan-log', element: Lazy(ScanLogPage) },
      { path: 'orders/abandoned-carts', element: Lazy(AbandonedCartsPage) },
      { path: 'orders/tracking', element: Lazy(OrderTrackingPage) },
      { path: 'pos', element: Lazy(POSPage) },
      { path: 'customers', element: Lazy(CustomersPage) },
      { path: 'inventory/products', element: Lazy(InventoryProductsPage) },
      { path: 'inventory/products/:productId', element: Lazy(ProductDetailsPage) },
      { path: 'inventory/collections', element: Lazy(CollectionsPage) },
      { path: 'inventory/last-pieces', element: Lazy(InventoryLastPiecesPage) },
      { path: 'inventory/low-stock', element: Lazy(LowStockPage) },
      { path: 'inventory/reviews', element: Lazy(ReviewsPage) },
      { path: 'marketing/discounts', element: Lazy(DiscountsPage) },
      { path: 'marketing/pricing', element: Lazy(PricingPage) },
      { path: 'finance/overview', element: Lazy(OverviewPage) },
      { path: 'finance/deposits', element: Lazy(DepositsPage) },
      { path: 'finance/expenses', element: Lazy(ExpensesPage) },
      { path: 'finance/budgets', element: Lazy(BudgetsPage) },
      { path: 'finance/reports', element: Lazy(ReportsPage) },
      { path: 'finance/capital', element: Lazy(CapitalPage) },
      { path: 'finance/cash-flow', element: Lazy(CashFlowPage) },
      { path: 'finance/profit-settlement', element: Lazy(ProfitSettlementPage) },
      { path: 'finance/analytics', element: Lazy(FinanceAnalyticsPage) },
      { path: 'settings', element: Lazy(MainSettingsPage) },
      { path: 'settings/analytics', element: Lazy(AnalyticsPage) },
      { path: 'settings/shipping', element: Lazy(ShippingPage) },
      { path: 'settings/payments', element: Lazy(PaymentsPage) },
      { path: 'ecommerce/website-builder', element: Lazy(WebsiteBuilderPage) },
      { path: 'ecommerce/visit-store', element: Lazy(VisitStorePage) },
      { path: 'ecommerce/custom-domains', element: Lazy(CustomDomainsPage) },
      { path: 'ecommerce/templates', element: Lazy(TemplatesPage) },
      { path: 'ecommerce/website-settings', element: Lazy(WebsiteSettingsPage) },
      { path: 'ecommerce/navigation', element: Lazy(NavigationPage) },
      { path: 'ecommerce/code-editor', element: Lazy(CodeEditorPage) },
      { path: 'ecommerce/external-website', element: Lazy(ExternalWebsitePage) },
      { path: 'rbac/roles', element: Lazy(RolesPage) },
      { path: 'rbac/users', element: Lazy(UsersPage) },
    ]
  },
  { path: 'ecommerce/builder', element: <ProtectedRoute>{Lazy(BuilderPage)}</ProtectedRoute> },
  { path: 'ecommerce/preview/:siteId', element: <ProtectedRoute>{Lazy(StorePreviewPage)}</ProtectedRoute> },
  { path: 'site/:siteId', element: Lazy(PublicWebsitePage) },
  { path: 'site/:siteId/products', element: Lazy(ProductsPage) },
  { path: 'site/:siteId/last', element: Lazy(LastPiecesPage) },
  { path: 'site/:siteId/about', element: Lazy(AboutPage) },
  { path: 'site/:siteId/cart', element: Lazy(CartPage) },
  { path: 'site/:siteId/favorites', element: Lazy(FavoritePage) },
  { path: 'site/:siteId/profile', element: Lazy(ProfilePage) },
  { path: 'site/:siteId/login', element: Lazy(PublicLoginPage) },
  { path: 'site/:siteId/register', element: Lazy(RegisterPage) },
  { path: 's/:siteId', element: Lazy(PublicWebsitePage) },
  { path: '/login', element: Lazy(LoginPage) },
  { path: '/setup-password', element: Lazy(SetupPasswordPage) },
  { path: '/reset-password', element: Lazy(ResetPasswordPage) },
  { path: '/no-access', element: Lazy(NoAccessPage) },
], {
  basename: '/dashboard',
  future: { v7_startTransition: true }
});
