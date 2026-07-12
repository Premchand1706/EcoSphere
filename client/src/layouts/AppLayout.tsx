import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import { 
  LayoutDashboard, 
  Leaf, 
  Users, 
  ShieldCheck, 
  Trophy, 
  LogOut, 
  User as UserIcon,
  Building,
  Bell
} from 'lucide-react';
import { useState } from 'react';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch active user details
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    }
  });

  // Fetch notifications
  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/esg/notifications');
      return res.data;
    },
    enabled: !!user
  });

  const activeNotifications = notifications?.filter((n: any) => !n.isRead) || [];

  const markNotificationRead = async (id: string) => {
    await apiClient.post(`/esg/notifications/${id}/read`);
    refetchNotifications();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { label: 'Executive Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Environmental Module', path: '/environmental', icon: Leaf },
    { label: 'Social Impact Portal', path: '/social', icon: Users },
    { label: 'Governance & Audits', path: '/governance', icon: ShieldCheck },
    { label: 'Gamification Arena', path: '/gamification', icon: Trophy }
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-emerald-500">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  // Calculate XP progress percentage
  const nextLevelXp = Math.pow(user?.level || 1, 2) * 100;
  const currentLevelXp = Math.pow((user?.level || 1) - 1, 2) * 100;
  const xpInCurrentLevel = (user?.xp || 0) - currentLevelXp;
  const xpRequiredForNext = nextLevelXp - currentLevelXp;
  const xpPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequiredForNext) * 100));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800">
            <Leaf className="h-7 w-7 text-emerald-500 mr-3 animate-pulse" />
            <span className="font-bold text-xl tracking-wider text-emerald-400">EcoSphere</span>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center mb-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-bold mr-3">
              {user?.firstName[0]}{user?.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>
          
          {/* Sign Out Trigger */}
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Execution Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-8 z-10">
          {/* Org Context */}
          <div className="flex items-center space-x-2 text-slate-300">
            <Building className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">{user?.organizationName}</span>
            {user?.departmentName && (
              <>
                <span className="text-slate-600">/</span>
                <span className="text-xs text-slate-400">{user.departmentName}</span>
              </>
            )}
          </div>

          {/* Gamification Level & Notifications */}
          <div className="flex items-center space-x-6">
            {/* Level & XP Gauge */}
            <div className="flex items-center space-x-3 bg-slate-800/40 border border-slate-800 px-4 py-1.5 rounded-full">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Lvl {user?.level}</span>
              <div className="w-24 bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${xpPercent}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">{user?.xp} XP</span>
            </div>

            {/* Notification Drawer Trigger */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all relative border border-slate-800"
              >
                <Bell className="h-4 w-4" />
                {activeNotifications.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-slate-900 animate-bounce">
                    {activeNotifications.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                    <span className="text-xs font-bold text-slate-300">Notifications</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications?.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 text-center">No notifications yet.</p>
                    ) : (
                      notifications?.map((notif: any) => (
                        <div 
                          key={notif.id} 
                          className={`p-3 text-xs transition-all ${notif.isRead ? 'opacity-60' : 'bg-emerald-500/5'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-slate-200">{notif.title}</span>
                            {!notif.isRead && (
                              <button 
                                onClick={() => markNotificationRead(notif.id)}
                                className="text-[10px] text-emerald-400 hover:underline"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                          <p className="text-slate-400 leading-relaxed">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
