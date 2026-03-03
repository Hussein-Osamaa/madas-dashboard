'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ClientOnly } from '@/components/ClientOnly'

export default function DashboardPage() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && mounted) {
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
  }, [user, userData, loading, router, mounted])

  return (
    <ClientOnly fallback={<LoadingScreen />}>
      {!mounted || loading ? (
        <LoadingScreen />
      ) : !user || !userData?.approved ? (
        null
      ) : (
        <DashboardLayout>
          <DashboardContent />
        </DashboardLayout>
      )}
    </ClientOnly>
  )
}
