'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, signOut, doc, getDoc, updateDoc, query, collection, where, getDocs, auth, db } from '@/lib/backend'
// Minimal User type compatible with backend-adapter auth object
type User = { uid: string; email: string | null; displayName: string | null; [key: string]: unknown }

interface UserData {
  name?: string
  firstName?: string
  lastName?: string
  email: string
  contact?: string
  phone?: string
  createdAt: string
  lastLogin: string
  approved: boolean
  permissions: {
    home?: string[]
    orders?: string[]
    inventory?: string[]
    customers?: string[]
    employees?: string[]
    finance?: string[]
    analytics?: string[]
    settings?: string[]
  }
  role: string
  status: string
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  logout: () => Promise<void>
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  const adminEmails = [
    "hesainosama@gmail.com",
    // Add more admin emails here
  ]

  const refreshUserData = async () => {
    if (!user) return

    try {
      // Check if user exists in staff collection
      const q = query(collection(db, "staff"), where("email", "==", user.email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setUserData(null)
        return
      }

      const docData = querySnapshot.docs[0].data() as UserData
      const docId = querySnapshot.docs[0].id

      // Auto-approve admin user
      if (adminEmails.includes(user.email || '')) {
        const adminPermissions = {
          home: ["view"],
          orders: ["view", "search", "create", "edit"],
          inventory: ["view", "edit"],
          customers: ["view", "edit"],
          employees: ["view", "edit"],
          finance: ["view", "reports"],
          analytics: ["view", "export"],
          settings: ["view", "edit"]
        }

        await updateDoc(doc(db, "staff", docId), {
          approved: true,
          role: "admin",
          permissions: adminPermissions
        })

        docData.approved = true
        docData.role = "admin"
        docData.permissions = adminPermissions
      }

      // Ensure all approved users have at least home view permission
      if (docData.approved && (!docData.permissions || !docData.permissions.home)) {
        const defaultPermissions = {
          home: ["view"],
          ...docData.permissions
        }

        await updateDoc(doc(db, "staff", docId), {
          permissions: defaultPermissions
        })

        docData.permissions = defaultPermissions
      }

      setUserData(docData)
      localStorage.setItem("madasUser", JSON.stringify(docData))
    } catch (error) {
      console.error("Error fetching user data:", error)
      setUserData(null)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      
      if (user) {
        await refreshUserData()
      } else {
        setUserData(null)
        localStorage.removeItem("madasUser")
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      setUserData(null)
      localStorage.removeItem("madasUser")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const value = {
    user,
    userData,
    loading,
    logout,
    refreshUserData
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
