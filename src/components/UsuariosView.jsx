import React, { useState, useEffect, memo } from 'react'
import Icon from './Icon'
import * as store from '../lib/store'

const UsuariosView = memo(({ 
  user, 
  reloadFromSupabase, 
  setNotification, 
  puedeCrearUsuario, 
  planInfo, 
  setLimiteAlerta 
}) => {
  const isSuperAdmin = user?.rol_id === 'superadmin'
  const [usuarios, setUsuarios] = useState(store.getUsuarios(user?.id, isSuperAdmin))
  const [localEditingUser, setLocalEditingUser] = useState(null)
  const [localShowUserModal, setLocalShowUserModal] = useState(false)
  const [localShowDeleteModal, setLocalShowDeleteModal] = useState(null)
  const [localShowDeactivateModal, setLocalShowDeactivateModal] = useState(null)
  const [migrateToUser, setMigrateToUser] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [userFormData, setUserFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol_id: 'encargado',
    activo: true
  })

  // Auto-refresh para actualizar estados de presencia cada 30 segundos
  useEffect(() => {
    const refreshPresencia = async () => {
      await reloadFromSupabase()
      setUsuarios(store.getUsuarios(user?.id, isSuperAdmin))
    }

    const interval = setInterval(refreshPresencia, 30 * 1000) // 30 segundos

    return () => clearInterval(interval)
  }, [isSuperAdmin, reloadFromSupabase, user?.id])

  const refreshUsuarios = async () => {
    await reloadFromSupabase()
    setUsuarios(store.getUsuarios(user?.id, isSuperAdmin))
  }

  const openNewUser = () => {
    if (!puedeCrearUsuario()) {
      setLimiteAlerta({
        tipo: 'usuarios',
        mensaje: `Has alcanzado el límite de ${planInfo?.limites?.max_usuarios || 1} usuario(s) de tu plan ${planInfo?.nombre || 'actual'}. Actualiza tu plan para agregar más usuarios.`
      })
      return
    }
    setLocalEditingUser(null)
    setUserFormData({ nombre: '', email: '', password: '', rol_id: 'encargado', activo: true })
    setLocalShowUserModal(true)
  }

  const handleEditUser = (u) => {
    setLocalEditingUser(u)
    setUserFormData({
      nombre: u.nombre || '',
      email: u.email || '',
      password: '',
      rol_id: u.rol_id || 'encargado',
      activo: u.activo !== false
    })
    setLocalShowUserModal(true)
  }

  const saveUser = async (e) => {
    e.preventDefault()
    setInviteLoading(true)

    try {
      if (localEditingUser) {
        // Update user
        const result = await store.updateUsuario(localEditingUser.id, userFormData)
        if (result.error) throw new Error(result.error)
        setNotification({ type: 'success', message: 'Usuario actualizado correctamente' })
      } else {
        // Invite user
        const result = await store.invitarUsuario({
          ...userFormData,
          institucion_id: user?.institucion_id,
          invitado_por: user?.id
        })
        if (result.error) throw new Error(result.error)
        setNotification({ type: 'success', message: 'Invitación enviada correctamente' })
      }

      setLocalShowUserModal(false)
      refreshUsuarios()
    } catch (error) {
      setNotification({ type: 'error', message: error.message })
    } finally {
      setInviteLoading(false)
      setTimeout(() => setNotification(null), 3000)
    }
  }

  const handleDeleteUser = async () => {
    if (!localShowDeleteModal || !migrateToUser) return

    try {
      const result = await store.eliminarUsuario(localShowDeleteModal.id, migrateToUser)
      if (result.error) throw new Error(result.error)
      
      setNotification({ type: 'success', message: 'Usuario eliminado correctamente' })
      setLocalShowDeleteModal(null)
      setMigrateToUser('')
      refreshUsuarios()
    } catch (error) {
      setNotification({ type: 'error', message: error.message })
    } finally {
      setTimeout(() => setNotification(null), 3000)
    }
  }

  const handleDeactivateUser = async () => {
    if (!localShowDeactivateModal || !migrateToUser) return

    try {
      const result = await store.desactivarUsuario(localShowDeactivateModal.id, migrateToUser)
      if (result.error) throw new Error(result.error)
      
      setNotification({ type: 'success', message: 'Usuario desactivado correctamente' })
      setLocalShowDeactivateModal(null)
      setMigrateToUser('')
      refreshUsuarios()
    } catch (error) {
      setNotification({ type: 'error', message: error.message })
    } finally {
      setTimeout(() => setNotification(null), 3000)
    }
  }

  const handleResendInvitation = async (u) => {
    setInviteLoading(true)
    try {
      const result = await store.reenviarInvitacion(u.id)
      if (result.error) throw new Error(result.error)
      setNotification({ type: 'success', message: 'Invitación reenviada correctamente' })
    } catch (error) {
      setNotification({ type: 'error', message: error.message })
    } finally {
      setInviteLoading(false)
      setTimeout(() => setNotification(null), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
          <p className="text-slate-500">Administra los accesos de tu equipo</p>
        </div>
        <button onClick={openNewUser} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 flex items-center gap-2">
          <Icon name="UserPlus" size={20} /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
              <th className="p-4 font-medium">Usuario</th>
              <th className="p-4 font-medium">Rol</th>
              <th className="p-4 font-medium">Estado</th>
              <th className="p-4 font-medium">Última actividad</th>
              <th className="p-4 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold">
                      {u.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{u.nombre}</p>
                      <p className="text-sm text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.rol_id === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.rol_id}
                  </span>
                </td>
                <td className="p-4">
                  {u.activo === false ? (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Inactivo</span>
                  ) : u.invitacion_aceptada ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Activo</span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Invitación pendiente</span>
                  )}
                </td>
                <td className="p-4 text-sm text-slate-500">
                  {u.last_seen ? new Date(u.last_seen).toLocaleString() : 'Nunca'}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!u.invitacion_aceptada && (
                      <button onClick={() => handleResendInvitation(u)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Reenviar invitación">
                        <Icon name="Mail" size={18} />
                      </button>
                    )}
                    <button onClick={() => handleEditUser(u)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg">
                      <Icon name="Edit" size={18} />
                    </button>
                    {u.id !== user?.id && (
                      <button onClick={() => setLocalShowDeactivateModal(u)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                        <Icon name="UserX" size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Usuario */}
      {localShowUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">{localEditingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setLocalShowUserModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Icon name="X" size={20} /></button>
            </div>
            <form onSubmit={saveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input required type="text" value={userFormData.nombre} onChange={e => setUserFormData({...userFormData, nombre: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (será su usuario)</label>
                <input required type="email" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select value={userFormData.rol_id} onChange={e => setUserFormData({...userFormData, rol_id: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500">
                  <option value="encargado">Encargado</option>
                  <option value="superadmin">Administrador</option>
                  <option value="rector">Rector / Solo Lectura</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="user_activo" checked={userFormData.activo} onChange={e => setUserFormData({...userFormData, activo: e.target.checked})} className="rounded text-violet-600 focus:ring-violet-500" />
                <label htmlFor="user_activo" className="text-sm font-medium text-slate-700">Usuario Activo</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setLocalShowUserModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg">Cancelar</button>
                <button type="submit" disabled={inviteLoading} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg flex items-center justify-center gap-2">
                  {inviteLoading ? <Icon name="Loader2" className="animate-spin" size={20} /> : (localEditingUser ? 'Guardar' : 'Invitar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Desactivar/Eliminar con Migración */}
      {(localShowDeactivateModal || localShowDeleteModal) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Reasignar Leads</h3>
            <p className="text-slate-600 mb-4">El usuario {localShowDeactivateModal?.nombre || localShowDeleteModal?.nombre} tiene leads asignados. Elige a quién reasignarlos antes de continuar:</p>
            <select value={migrateToUser} onChange={e => setMigrateToUser(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-6">
              <option value="">Selecciona un usuario...</option>
              {usuarios.filter(u => u.id !== (localShowDeactivateModal?.id || localShowDeleteModal?.id)).map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => { setLocalShowDeactivateModal(null); setLocalShowDeleteModal(null); }} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg">Cancelar</button>
              <button onClick={localShowDeactivateModal ? handleDeactivateUser : handleDeleteUser} disabled={!migrateToUser} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default UsuariosView
