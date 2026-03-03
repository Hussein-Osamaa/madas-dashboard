import { AdminLayout } from '@/components/layout/AdminLayout'
import { Dashboard } from '@/components/pages/Dashboard'

export default function AdminPage() {
  return (
    <AdminLayout>
      <Dashboard />
    </AdminLayout>
  )
}
