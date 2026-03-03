import { AdminLayout } from '@/components/layout/AdminLayout'
import { UsersPage } from '@/components/pages/UsersPage'

export const metadata = {
  title: 'Users - Admin Panel',
  description: 'Manage users and their accounts',
}

export default function UsersAdminPage() {
  return (
    <AdminLayout>
      <UsersPage />
    </AdminLayout>
  )
}
