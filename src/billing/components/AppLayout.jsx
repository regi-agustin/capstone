import { Outlet, useLocation } from 'react-router-dom';
import { ReceiptText, CreditCard, ClipboardCheck, ShieldCheck } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { useBilling } from '../context/BillingContext.jsx';

const TITLES = {
  '/reviews': { title: 'Booking Review', crumb: 'FleetOps / Pricing Desk' },
  '/invoices': { title: 'Clients Billing', crumb: 'FleetOps / Billing Desk' },
  '/payments': { title: 'Payments', crumb: 'FleetOps / Collections' },
};

const NAV = [
  { to: '/reviews', label: 'Booking Review', icon: ClipboardCheck },
  { to: '/invoices', label: 'Clients Billing', icon: ReceiptText },
  { to: '/payments', label: 'Payments', icon: CreditCard },
];

export default function AppLayout() {
  const location = useLocation();
  const { auth, switchToAdmin, logout } = useBilling();
  const user = auth.currentUser;
  const meta = TITLES[location.pathname] || { title: 'Billing', crumb: 'FleetOps' };

  return (
    <AppShell
      groups={[
        {
          label: 'Billing',
          items: NAV,
        },
        ...(switchToAdmin
          ? [
              {
                label: 'Account',
                items: [
                  { key: 'admin', label: 'Super Admin Console', icon: ShieldCheck, onClick: switchToAdmin },
                ],
              },
            ]
          : []),
      ]}
      role="Billing Officer"
      roleSub="Invoices, collections, and reports"
      user={user?.name || 'Billing Officer'}
      userSub="Billing Officer"
      title={meta.title}
      crumb={meta.crumb}
      onLogout={logout}
    >
      <Outlet />
    </AppShell>
  );
}