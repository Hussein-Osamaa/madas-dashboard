'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Shield, LogOut, User } from 'lucide-react'

interface UserData {
  name?: string
  firstName?: string
  lastName?: string
  email: string
  role: string
  approved: boolean
  permissions: Record<string, string[]>
}

export default function NoAccessPage() {
  const { user, logout } = useAuth()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  const pagePermissions = {
    "dashboard": { section: "home", permission: "view", name: "Dashboard" },
    "orders": { section: "orders", permission: "view", name: "Orders" },
    "products": { section: "inventory", permission: "view", name: "Inventory" },
    "customers": { section: "customers", permission: "view", name: "Customers" },
    "admin": { section: "employees", permission: "view", name: "Staff" },
    "finance": { section: "finance", permission: "view", name: "Finance" },
    "analytics": { section: "analytics", permission: "view", name: "Analytics" },
    "reports": { section: "reports", permission: "view", name: "Reports" },
    "insights": { section: "insights", permission: "view", name: "Insights" },
  }

  useEffect(() => {
    if (user) {
      fetchUserData()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchUserData = async () => {
    if (!user) return

    try {
      // Try to find user in 'users' collection first
      let q = query(collection(db, "users"), where("email", "==", user.email))
      let querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data() as UserData
        setUserData(data)
        return
      }

      // If not found in 'users', try 'staff' collection
      q = query(collection(db, "staff"), where("email", "==", user.email))
      querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data() as UserData
        setUserData(data)
      } else {
        // If user not found in either collection, create a default user data
        console.log('User not found in database, creating default data')
        setUserData({
          email: user.email || '',
          role: 'user',
          approved: false,
          permissions: {}
        })
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      // Set default user data on error
      setUserData({
        email: user.email || '',
        role: 'user',
        approved: false,
        permissions: {}
      })
    } finally {
      setLoading(false)
    }
  }

  const getAvailablePages = () => {
    if (!userData?.permissions) return []
    
    const availablePages = []
    Object.entries(pagePermissions).forEach(([page, perm]) => {
      const hasPermission = userData.permissions?.[perm.section]?.includes(perm.permission)
      if (hasPermission) {
        availablePages.push(perm.name)
      }
    })
    return availablePages
  }

  const getAccessReason = () => {
    if (!userData) return "Access denied for the requested page."
    
    const currentPage = window.location.search.split('page=')[1] || 'unknown'
    const requiredPermission = pagePermissions[currentPage as keyof typeof pagePermissions]

    if (requiredPermission) {
      const hasPermission = userData.permissions?.[requiredPermission.section]?.includes(requiredPermission.permission)
      if (!hasPermission) {
        return `You need "${requiredPermission.permission}" permission for the ${requiredPermission.name} page.`
      } else {
        return `Access denied for ${requiredPermission.name} page.`
      }
    }
    
    return "Access denied for the requested page."
  }

  const username = userData?.name || 
    (userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : '') ||
    user?.displayName || 
    user?.email?.split('@')[0] || 
    'User'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-madas-primary mx-auto mb-4"></div>
          <p className="text-madas-primary font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="glass-effect shadow-lg border-b border-white/20">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-madas-primary rounded-lg flex items-center justify-center shadow-md">
              <img src="/assets/img/madas.svg" alt="Madas Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold text-gradient">MADAS Admin</h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">{username}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="w-8 h-8 bg-madas-accent rounded-full flex items-center justify-center shadow-md">
              <span className="text-madas-primary font-bold text-sm">{username.charAt(0).toUpperCase()}</span>
            </div>
            <button 
              onClick={logout}
              className="text-gray-500 hover:text-madas-primary p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
        <div className="glass-effect p-8 rounded-2xl shadow-2xl max-w-2xl w-full card-hover">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Shield className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-gradient mb-3">Access Denied</h1>
            <p className="text-gray-600 mb-4 text-lg">You don't have permission to access the requested page.</p>
            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">{getAccessReason()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl shadow-md">
              <h3 className="font-semibold text-madas-primary mb-4 text-lg">Your Current Status</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium bg-madas-primary/10 text-madas-primary px-3 py-1 rounded-full">
                    {userData?.role || 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Approved:</span>
                  <span className={`font-medium px-3 py-1 rounded-full ${
                    userData?.approved 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {userData?.approved ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Permissions:</span>
                  <span className="font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    {userData?.permissions ? Object.keys(userData.permissions).length : 0} sections
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl shadow-md">
              <h3 className="font-semibold text-madas-primary mb-4 text-lg">Available Pages</h3>
              <div className="space-y-2 text-sm">
                {getAvailablePages().length > 0 ? (
                  getAvailablePages().map((page, index) => (
                    <div key={index} className="flex items-center text-green-600 bg-green-50 p-2 rounded-lg">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      {page}
                    </div>
                  ))
                ) : (
                  <div className="text-red-600 bg-red-50 p-3 rounded-lg text-center">
                    <Shield className="w-5 h-5 mx-auto mb-2" />
                    No pages available
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/"
              className="btn-primary text-white font-semibold py-3 px-8 rounded-xl flex items-center justify-center shadow-lg"
            >
              <User className="w-5 h-5 mr-2" />
              Go to Dashboard
            </a>
            <button 
              onClick={() => alert("Contact admin functionality will be implemented here. For now, please contact your system administrator to request access.")}
              className="bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 font-semibold py-3 px-8 rounded-xl transition-all flex items-center justify-center shadow-lg"
            >
              <Shield className="w-5 h-5 mr-2" />
              Contact Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
