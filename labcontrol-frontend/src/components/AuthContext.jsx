/**
 * AuthContext.jsx — React Context for user authentication state & 2FA
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children, apiBase }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [awaiting2FA, setAwaiting2FA] = useState(false)

  // Verify session on app load
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/me`, {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated) {
          setUser({
            username: data.username,
            role: data.role,
            two_factor_enabled: data.two_factor_enabled
          })
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch (err) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  async function login(username, password) {
    try {
      const res = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        if (data.requires_2fa) {
          setAwaiting2FA(true)
          return { success: true, requires_2fa: true }
        }
        setUser({
          username: data.username,
          role: data.role,
          two_factor_enabled: data.two_factor_enabled
        })
        setAwaiting2FA(false)
        return { success: true, requires_2fa: false }
      } else {
        return { success: false, error: data.error || 'Authentication failed' }
      }
    } catch (err) {
      return { success: false, error: 'Network error: ' + err.message }
    }
  }

  async function verify2FA(code) {
    try {
      const res = await fetch(`${apiBase}/api/login/2fa-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setUser({
          username: data.username,
          role: data.role,
          two_factor_enabled: true
        })
        setAwaiting2FA(false)
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Invalid verification code' }
      }
    } catch (err) {
      return { success: false, error: 'Network error: ' + err.message }
    }
  }

  function cancel2FA() {
    setAwaiting2FA(false)
  }

  async function logout() {
    try {
      await fetch(`${apiBase}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
      setAwaiting2FA(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        awaiting2FA,
        login,
        verify2FA,
        cancel2FA,
        logout,
        setUser,
        refreshUser: checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    return {
      user: null,
      loading: false,
      awaiting2FA: false,
      login: async () => ({ success: false, error: 'Auth not initialized' }),
      verify2FA: async () => ({ success: false, error: 'Auth not initialized' }),
      cancel2FA: () => {},
      logout: async () => {},
      setUser: () => {},
      refreshUser: () => {}
    }
  }
  return context
}
