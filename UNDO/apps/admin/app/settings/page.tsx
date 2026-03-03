import { AdminLayout } from '@/components/layout/AdminLayout'
import { SettingsPage } from '@/components/pages/SettingsPage'

export const metadata = {
  title: 'Settings - Admin Panel',
  description: 'Admin settings and configuration',
}

export default function SettingsAdminPage() {
  return (
    <AdminLayout>
      <SettingsPage />
    </AdminLayout>
  )
}
