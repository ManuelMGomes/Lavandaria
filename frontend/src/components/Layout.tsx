import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Settings as SettingsIcon, 
  Menu, 
  X,
  Droplets,
  LogOut,
  User as UserIcon,
  Shirt,
  FileText,
  LifeBuoy,
  Boxes
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User, LaundrySettings } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  settings: LaundrySettings;
  onLogout: () => void;
  stockLowCount?: number;
  stockCriticalCount?: number;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  user,
  settings,
  onLogout,
  stockLowCount = 0,
  stockCriticalCount = 0,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const stockBadgeClass =
    stockCriticalCount > 0
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { id: 'orders', label: 'Pedidos', icon: Shirt, roles: ['admin', 'cashier'] },
    { id: 'customers', label: 'Clientes', icon: Users, roles: ['admin', 'cashier'] },
    { id: 'reports', label: 'Relatórios', icon: FileText, roles: ['admin', 'cashier'] },
    { id: 'support', label: 'Equipa Técnica', icon: LifeBuoy, roles: ['admin', 'cashier'] },
    { id: 'cashiers', label: 'Gerenciar Caixas', icon: UserIcon, roles: ['admin'] },
    { id: 'services', label: 'Serviços', icon: Shirt, roles: ['admin'] },
    { id: 'stock', label: 'Estoque', icon: Boxes, roles: ['admin'] },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon, roles: ['admin'] },
  ]
    .filter(item => item.roles.includes(user.role))
    .map(item => {
      if (user.role === 'cashier' && item.id === 'reports') {
        return { ...item, label: 'Relatório Diário' };
      }

      return item;
    });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#ffffff_40%)] flex flex-col md:flex-row print:bg-white print:block">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white/90 backdrop-blur border-r border-[#d8eaf8] sticky top-0 h-screen overflow-hidden print:hidden">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0e2a47] to-[#4ea9d9] flex items-center justify-center text-white shadow-lg shadow-[#0e2a4730]">
              <Droplets className="w-6 h-6" />
            </div>
          )}
          <span className="font-bold text-xl tracking-tight text-slate-800 truncate">{settings.tradeName || 'Sistema GenOmni'}</span>
        </div>
        
        <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-[#dff2ff] text-[#0e2a47] font-semibold shadow-md shadow-[#4ea9d922]" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                activeTab === item.id ? "text-[#0e2a47]" : "text-slate-400 group-hover:text-slate-600"
              )} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'stock' && stockLowCount > 0 ? (
                <span className={cn("inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold", stockBadgeClass)}>
                  {stockLowCount}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role === 'cashier' ? 'Gerente de Caixa' : 'Administrador'}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white/95 backdrop-blur border-b border-[#d8eaf8] p-4 flex items-center justify-between sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-2">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0e2a47] to-[#4ea9d9] flex items-center justify-center text-white">
              <Droplets className="w-5 h-5" />
            </div>
          )}
          <span className="font-bold text-lg text-slate-800 truncate">{settings.tradeName || 'Sistema GenOmni'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onLogout}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] overflow-y-auto bg-white z-40 p-4 animate-in slide-in-from-top duration-200 print:hidden">
          <div className="mb-6 p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{user.name}</p>
              <p className="text-sm text-slate-500 capitalize">{user.role === 'cashier' ? 'Gerente de Caixa' : 'Administrador'}</p>
            </div>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all",
                  activeTab === item.id 
                    ? "bg-[#dff2ff] text-[#0e2a47] font-semibold" 
                    : "text-slate-600"
                )}
              >
                <item.icon className="w-6 h-6" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'stock' && stockLowCount > 0 ? (
                  <span className={cn("inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold", stockBadgeClass)}>
                    {stockLowCount}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0 print:overflow-visible">
        <div className="max-w-7xl mx-auto print:max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
};
