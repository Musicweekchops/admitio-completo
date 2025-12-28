// ============================================
// ADMITIO BACKOFFICE - Main Component
// src/pages/backoffice/Backoffice.jsx
// ============================================

import { BackofficeAuthProvider, useBackofficeAuth } from '../../context/BackofficeAuthContext'
import BackofficeLogin from './BackofficeLogin'
import BackofficeDashboard from './BackofficeDashboard'
import { Loader } from 'lucide-react'

// Componente interno que usa el context
const BackofficeContent = () => {
  const { isAuthenticated, loading } = useBackofficeAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <BackofficeLogin />
  }

  return <BackofficeDashboard />
}

// Componente exportado con el Provider
const Backoffice = () => {
  return (
    <BackofficeAuthProvider>
      <BackofficeContent />
    </BackofficeAuthProvider>
  )
}

export default Backoffice
