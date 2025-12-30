// ============================================
// ADMITIO BACKOFFICE - Login Page
// src/pages/backoffice/BackofficeLogin.jsx
// ============================================

import { useState } from 'react'
import { useBackofficeAuth } from '../../context/BackofficeAuthContext'
import { Shield, Mail, Key, ArrowLeft, Loader, AlertCircle, Lock } from 'lucide-react'

const BackofficeLogin = () => {
  const { 
    paso2FA, 
    emailPendiente,
    iniciarLogin, 
    verificarCodigo,
    reenviarCodigo,
    cancelarLogin 
  } = useBackofficeAuth()

  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reenviando, setReenviando] = useState(false)

  const handleSubmitEmail = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    const result = await iniciarLogin(email)
    
    if (!result.success) {
      setError(result.error)
    }
    
    setLoading(false)
  }

  const handleSubmitCodigo = async (e) => {
    e.preventDefault()
    if (!codigo.trim() || codigo.length !== 6) {
      setError('Ingresa el código de 6 dígitos')
      return
    }

    setLoading(true)
    setError('')

    const result = await verificarCodigo(codigo)
    
    if (!result.success) {
      setError(result.error)
      setCodigo('')
    }
    
    setLoading(false)
  }

  const handleReenviar = async () => {
    setReenviando(true)
    setError('')
    
    const result = await reenviarCodigo()
    
    if (result.success) {
      setError('')
      setCodigo('')
    } else {
      setError(result.error)
    }
    
    setReenviando(false)
  }

  const handleVolver = () => {
    cancelarLogin()
    setEmail('')
    setCodigo('')
    setError('')
  }

  // Pantalla de ingreso de código 2FA
  if (paso2FA) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Backoffice</h1>
            <p className="text-slate-400 text-sm">Admitio Control Panel</p>
          </div>

          {/* Card */}
          <div className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700">
            <button
              onClick={handleVolver}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm"
            >
              <ArrowLeft size={16} />
              Cambiar email
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-violet-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-7 h-7 text-violet-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Verificación de seguridad
              </h2>
              <p className="text-slate-400 text-sm">
                Ingresa el código de 6 dígitos enviado a
              </p>
              <p className="text-violet-400 font-medium">{emailPendiente}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitCodigo}>
              <div className="mb-6">
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-4 bg-slate-700 border border-slate-600 rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-slate-500 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="000000"
                  autoFocus
                  maxLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading || codigo.length !== 6}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Verificar y acceder
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-500 text-sm mb-2">¿No recibiste el código?</p>
              <button
                onClick={handleReenviar}
                disabled={reenviando}
                className="text-violet-400 hover:text-violet-300 text-sm font-medium disabled:text-slate-500"
              >
                {reenviando ? 'Reenviando...' : 'Reenviar código'}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-slate-500 text-xs text-center">
                El código expira en 10 minutos. Si no lo recibes, revisa tu carpeta de spam.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Pantalla de ingreso de email
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Backoffice</h1>
          <p className="text-slate-400 text-sm">Admitio Control Panel</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              Acceso restringido
            </h2>
            <p className="text-slate-400 text-sm">
              Solo personal autorizado
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitEmail}>
            <div className="mb-6">
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Email de administrador
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="admin@admitio.cl"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowLeft size={18} className="rotate-180" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-slate-500 text-xs text-center">
              Te enviaremos un código de verificación a tu email para confirmar tu identidad.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-8">
          Admitio © {new Date().getFullYear()} — Acceso exclusivo para administradores
        </p>
      </div>
    </div>
  )
}

export default BackofficeLogin
