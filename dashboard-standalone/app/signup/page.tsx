'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword, updateProfile, setDoc, doc, collection, query, where, getDocs, auth, db } from '@/lib/backend'
import { Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react'
import { ClientOnly } from '@/components/ClientOnly'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    contact: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const router = useRouter()

  const checkPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    return strength
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value))
    }
  }

  const validateForm = () => {
    if (!formData.fullName || !formData.email || !formData.contact || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    if (!/^\+[1-9]\d{1,14}$/.test(formData.contact) && !/^@[a-zA-Z0-9._]{1,30}$/.test(formData.contact)) {
      setError('Please enter a valid phone number (+9715XXXXXXX) or Instagram handle (@username)')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (passwordStrength < 3) {
      setError('Password is too weak. Please use a stronger password.')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError('')

    try {
      // Check if email already exists
      const emailQuery = query(collection(db, "staff"), where("email", "==", formData.email))
      const emailSnapshot = await getDocs(emailQuery)

      if (!emailSnapshot.empty) {
        throw new Error('An account with this email already exists')
      }

      // Check if contact already exists
      const contactQuery = query(collection(db, "staff"), where("contact", "==", formData.contact))
      const contactSnapshot = await getDocs(contactQuery)

      if (!contactSnapshot.empty) {
        throw new Error('An account with this phone/Instagram already exists')
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      // Update profile with display name
      await updateProfile(user, { displayName: formData.fullName })

      // Save user data to Firestore
      await setDoc(doc(db, "staff", user.uid), {
        name: formData.fullName,
        email: formData.email,
        contact: formData.contact,
        phone: formData.contact,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        approved: false,
        permissions: {
          home: ["view"],
          orders: ["view"],
          inventory: ["view"],
          customers: ["view"],
          employees: ["view"]
        },
        role: "staff",
        status: "pending"
      })

      // Sign out and redirect to login
      await auth.signOut()
      router.push('/login?message=Account created successfully! Awaiting admin approval.')
    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500'
    if (passwordStrength <= 2) return 'bg-yellow-500'
    if (passwordStrength <= 3) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak'
    if (passwordStrength <= 2) return 'Fair'
    if (passwordStrength <= 3) return 'Good'
    return 'Strong'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-madas-light via-white to-madas-dark flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-madas-accent rounded-full opacity-10"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-madas-primary rounded-full opacity-10"></div>
      </div>

      {/* Main Signup Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="w-8 h-8 bg-madas-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <img src="/assets/img/madas.svg" alt="Madas Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-madas-primary mb-2">Create Account</h1>
          <p className="text-gray-600">Join the MADAS team</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white/95 backdrop-blur-20 border border-white/20 rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Input */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-madas-primary mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-madas-primary focus:ring-4 focus:ring-madas-primary/10 transition-all"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-madas-primary mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-madas-primary focus:ring-4 focus:ring-madas-primary/10 transition-all"
                />
              </div>
            </div>

            {/* Contact Input */}
            <div>
              <label htmlFor="contact" className="block text-sm font-semibold text-madas-primary mb-2">
                Phone or Instagram
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="contact"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  required
                  placeholder="+9715XXXXXXX or @yourhandle"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-madas-primary focus:ring-4 focus:ring-madas-primary/10 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-madas-primary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Create a strong password"
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-madas-primary focus:ring-4 focus:ring-madas-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-madas-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs mt-1 text-gray-500">
                    Password strength: <span className="font-medium">{getPasswordStrengthText()}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-madas-primary mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  placeholder="Confirm your password"
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-madas-primary focus:ring-4 focus:ring-madas-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-madas-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-madas-primary hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-madas-primary hover:text-green-800 font-semibold transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
