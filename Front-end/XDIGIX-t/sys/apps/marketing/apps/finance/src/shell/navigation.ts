import {
  BanknotesIcon,
  CalculatorIcon,
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  HomeModernIcon,
  ReceiptRefundIcon,
  ShieldCheckIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { ComponentType } from 'react';
import { FINANCE_PERMISSIONS } from '../context/PermissionsProvider';

export type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
  permission?: string | string[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

const NavigationConfig: NavSection[] = [
  {
    label: 'Insights',
    items: [
      { to: '/overview', label: 'Overview', icon: Squares2X2Icon, permission: FINANCE_PERMISSIONS.VIEW },
      { to: '/transactions', label: 'Transactions', icon: DocumentTextIcon, permission: FINANCE_PERMISSIONS.VIEW },
      { to: '/payments', label: 'Payments', icon: BanknotesIcon, badge: 'New', permission: FINANCE_PERMISSIONS.DEPOSIT }
    ]
  },
  {
    label: 'Operations',
    items: [
      { to: '/expenses', label: 'Expenses', icon: ReceiptRefundIcon, permission: FINANCE_PERMISSIONS.EXPENSES },
      { to: '/accounts', label: 'Accounts', icon: HomeModernIcon, permission: FINANCE_PERMISSIONS.VIEW },
      { to: '/budgets', label: 'Budgets', icon: ClipboardDocumentCheckIcon, permission: FINANCE_PERMISSIONS.REPORTS },
      { to: '/reports', label: 'Reports', icon: ChartPieIcon, permission: FINANCE_PERMISSIONS.REPORTS }
    ]
  },
  {
    label: 'Compliance',
    items: [
      { to: '/taxes', label: 'Taxes', icon: CalculatorIcon, permission: FINANCE_PERMISSIONS.REPORTS },
      { to: '/capital', label: 'Capital Return', icon: FolderOpenIcon, permission: FINANCE_PERMISSIONS.VIEW },
      { to: '/audit', label: 'Audit Log', icon: ShieldCheckIcon, permission: FINANCE_PERMISSIONS.VIEW },
      { to: '/settings', label: 'Settings', icon: ReceiptRefundIcon, permission: FINANCE_PERMISSIONS.VIEW }
    ]
  }
];

export default NavigationConfig;

