import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CambiarPassword from './pages/CambiarPassword';
import EstablecerPassword from './pages/EstablecerPassword';
import AuthCallback from './pages/AuthCallback';
import Backoffice from './pages/backoffice/Backoffice';

// Componente para detectar tokens en el hash y redirigir
const HashTokenHandler = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verificar si hay un token de Supabase en el hash
    const hash = window.location.hash;
    
    if (hash && (hash.includes('access_token') || hash.includes('error'))) {
      console.log('🔑 Token detectado en hash, redirigiendo a /auth/callback');
      // Redirigir a auth/callback manteniendo el hash
      navigate('/auth/callback' + hash, { replace: true });
      return;
    }
    
    setChecking(false);
  }, [navigate]);

  if (checking && window.location.hash.includes('access_token')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return children;
};

// Loading spinner
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Ruta protegida para usuarios autenticados
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Ruta pública (redirige si ya está autenticado)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// App Routes
const AppRoutes = () => {
  return (
    <HashTokenHandler>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        
        {/* Auth Callback - Para Supabase Auth */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Cambiar contraseña */}
        <Route path="/cambiar-password" element={<CambiarPassword />} />
        <Route path="/reset-password" element={<CambiarPassword />} />
        
        {/* Establecer contraseña (para usuarios invitados) */}
        <Route path="/establecer-password" element={<EstablecerPassword />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Backoffice - Panel de administración de Admitio */}
        <Route path="/backoffice" element={<Backoffice />} />

        {/* 404 - Redirigir a home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashTokenHandler>
  );
};

// Main App
const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
