
import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    PlusCircle,
    MessageSquare,
    Users,
    LogOut,
    Menu,
    X,
    Zap,
    FileText
} from 'lucide-react';
import heavenNightLogo from '../assets/new_heaven_white_logo.png';


export default function Layout() {
    const { signOut, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        { path: '/', label: 'Campaigns', icon: LayoutDashboard },
        { path: '/campaigns/new', label: 'New Campaign', icon: PlusCircle },
        { path: '/replies', label: 'Inbox', icon: MessageSquare },
        { path: '/leads', label: 'All Leads', icon: Users },
        { path: '/templates', label: 'Templates', icon: FileText },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white flex">
            {/* Sidebar for Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r border-gray-800 bg-gray-900/50 backdrop-blur-xl fixed h-full z-20">
                <div className="p-4 flex items-center justify-center border-b border-gray-800/50">
                    <img src={heavenNightLogo} alt="Heaven Nights" className="h-10 w-auto" />
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg shadow-blue-900/20'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <Icon className={`h-5 w-5 transition-colors ${isActive ? 'text-blue-400' : 'group-hover:text-white'}`} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800/50">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/30 border border-gray-700/30 mb-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-xs">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-900/10"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src={heavenNightLogo} alt="Heaven Nights" className="h-8 w-auto" />
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-400 hover:text-white"
                >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-20 bg-gray-950 pt-16 px-4 pb-6 space-y-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-medium border ${location.pathname === item.path
                                ? 'bg-blue-600/10 text-blue-400 border-blue-600/20'
                                : 'border-transparent text-gray-400'
                                }`}
                        >
                            <item.icon className="h-6 w-6" />
                            {item.label}
                        </Link>
                    ))}
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-4 text-lg text-red-400 border border-transparent rounded-xl hover:bg-red-900/10 mt-auto"
                    >
                        <LogOut className="h-6 w-6" />
                        Sign Out
                    </button>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 min-h-screen transition-all duration-300">
                <Outlet />
            </main>
        </div>
    );
}
