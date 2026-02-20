import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import useRole from '../hooks/useRole';

// Rutas permitidas por rol
const ROLE_ROUTES = {
    admin: ['/', '/circulos', '/taller', '/riego', '/ventas', '/estadisticas', '/admin'],
    circulos: ['/circulos'],
    taller: ['/taller'],
    riego: ['/riego'],
    ventas: ['/ventas'],
};

// Ruta de inicio por rol (para redirigir al entrar)
const ROLE_HOME = {
    admin: '/',
    circulos: '/circulos',
    taller: '/taller',
    riego: '/riego',
    ventas: '/ventas',
};

const PrivateRoute = ({ children }) => {
    const { user, role, loading } = useRole();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // No logueado → Login
    if (!user) {
        return <Navigate to="/login" />;
    }

    // Sin rol asignado → pantalla de acceso denegado
    if (!role) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-center px-4">
                <div className="text-5xl mb-4">🔒</div>
                <h1 className="text-2xl font-bold text-campo-carbon-800 mb-2">Sin acceso</h1>
                <p className="text-campo-beige-600 mb-2">
                    Tu cuenta no tiene un rol asignado. Contactá al administrador.
                </p>
                <p className="text-xs text-campo-beige-500 mb-6">{user.email}</p>
                <button
                    onClick={() => signOut(auth)}
                    className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Cerrar sesión y cambiar cuenta
                </button>
            </div>
        );
    }

    const allowed = ROLE_ROUTES[role] || [];
    const home = ROLE_HOME[role] || '/';

    // Si está en raíz / y no es admin, redirigir a su home
    if (location.pathname === '/' && role !== 'admin') {
        return <Navigate to={home} replace />;
    }

    // Si intenta acceder a una ruta no permitida, redirigir a su home
    if (!allowed.includes(location.pathname)) {
        return <Navigate to={home} replace />;
    }

    return children;
};

export { ROLE_ROUTES, ROLE_HOME };
export default PrivateRoute;
