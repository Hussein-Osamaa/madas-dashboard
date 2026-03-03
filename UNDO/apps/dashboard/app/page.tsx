'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function DashboardPage() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
        return
      }

      if (!userData?.approved) {
        router.push('/no-access')
        return
      }

      const hasHomePermission = userData?.permissions?.home?.includes('view')
      const isAdmin = userData?.role === 'admin'
      const hasAnyPermissions = userData?.permissions && Object.keys(userData.permissions).length > 0

      if (!hasHomePermission && !isAdmin && !hasAnyPermissions) {
        router.push('/no-access')
        return
      }
    }
  }, [user, userData, loading, router])

  if (loading) {
    return <LoadingScreen />
  }

  if (!user || !userData?.approved) {
    return null
  }

  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  )
}
