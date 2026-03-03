import { AdminLayout } from '@/components/layout/AdminLayout'
import { WebsitesPage } from '@/components/pages/WebsitesPage'

export const metadata = {
  title: 'Websites - Admin Panel',
  description: 'Manage websites and their content',
}

export default function WebsitesAdminPage() {
  return (
    <AdminLayout>
      <WebsitesPage />
    </AdminLayout>
  )
}
