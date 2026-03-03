import { AdminLayout } from '@/components/layout/AdminLayout'
import { SubscriptionsPage } from '@/components/pages/SubscriptionsPage'

export const metadata = {
  title: 'Subscriptions - Admin Panel',
  description: 'Manage subscriptions and billing',
}

export default function SubscriptionsAdminPage() {
  return (
    <AdminLayout>
      <SubscriptionsPage />
    </AdminLayout>
  )
}
