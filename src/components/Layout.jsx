import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Circle, Wrench, Droplets, DollarSign, Menu, X } from 'lucide-react';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Círculos', href: '/circulos', icon: Circle },
        { name: 'Taller', href: '/taller', icon: Wrench },
        { name: 'Riego', href: '/riego', icon: Droplets },
        { name: 'Ventas', href: '/ventas', icon: DollarSign },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="min-h-screen bg-campo-beige-50 flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-campo-green-950 text-campo-beige-100 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div className="flex items-center justify-between h-16 px-6 bg-campo-green-900 border-b border-campo-green-800">
                    <span className="text-xl font-bold tracking-tight text-white">CAMPO</span>
                    <button onClick={toggleSidebar} className="lg:hidden text-campo-beige-300 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav className="p-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                    ? 'bg-campo-green-700 text-white shadow-lg shadow-campo-green-900/20'
                                    : 'text-campo-beige-300 hover:text-white hover:bg-campo-green-800'
                                    }`}
                            >
                                <item.icon className="mr-3 h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-campo-green-800">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-campo-green-600 flex items-center justify-center text-white font-bold border border-campo-green-500">
                            A
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-white">Admin</p>
                            <p className="text-campo-beige-400 text-xs">admin@campo.com</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header (Mobile) */}
                <header className="lg:hidden bg-white border-b border-campo-beige-200 h-16 flex items-center px-4 justify-between">
                    <button onClick={toggleSidebar} className="text-campo-green-700 hover:text-campo-green-900">
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-lg text-campo-green-950">CAMPO</span>
                    <div className="w-6" /> {/* Spacer */}
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;

