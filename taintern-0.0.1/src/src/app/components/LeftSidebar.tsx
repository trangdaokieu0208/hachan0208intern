import { Link, useLocation } from 'react-router';
import { ListChecks, Users, Settings, ChevronRight, LayoutDashboard, Database, ShieldCheck, CreditCard, Table2, Calculator, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

const configItems = [
  { to: '/timesheet-summary', icon: Calculator, label: 'Timesheet Summary', sub: 'Calculate salaries' },
  { to: '/config/centers', icon: ListChecks, label: 'Centers Data', sub: 'Configure centers' },
  { to: '/config/ae', icon: Users, label: 'AE Data', sub: 'Configure employees' },
];

export function LeftSidebar({ isCollapsed, onToggle, onOpenSettings }: SidebarProps) {
  const location = useLocation();

  return (
    <motion.div
      animate={{ width: isCollapsed ? 60 : 220 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="relative h-full shrink-0 flex flex-col z-50 bg-transparent"
    >
      {/* Logo Section */}
      <div className={`flex items-center gap-3 w-full px-6 py-8 mb-4 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
        <div className="w-10 h-10 rounded-2xl bg-foreground flex items-center justify-center shadow-hard-sm shrink-0 border-2 border-border/20">
          <span className="text-primary text-xl font-black">P</span>
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <span className="font-black text-xl text-foreground tracking-tighter leading-none">
              PayRoll
            </span>
            <span className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-primary mt-1">
              Enterprise
            </span>
          </motion.div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-4 top-1/2 -translate-y-1/2 z-50 w-8 h-8 rounded-full bg-foreground text-primary shadow-lg flex items-center justify-center hover:bg-foreground/90 transition-all hover:scale-110 active:scale-95 border-2 border-border/20"
      >
        <motion.div animate={{ rotate: isCollapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
          <ChevronRight className="w-5 h-5" />
        </motion.div>
      </button>

      {/* Nav Section Label */}
      {!isCollapsed && (
        <div className="px-8 mb-4">
          <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-foreground/30">Configuration</p>
        </div>
      )}

      {/* Config Items */}
      <nav className="flex flex-col gap-2 w-full px-4 items-center flex-1">
        {configItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-200 group w-full border-2 ${
                isActive 
                  ? 'bg-foreground/5 border-border text-foreground shadow-hard-sm translate-x-1' 
                  : 'text-foreground/40 border-transparent hover:bg-foreground/5 hover:text-foreground/60'
              } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-foreground/20 group-hover:text-foreground/30'}`} />
              {!isCollapsed && (
                <div className="min-w-0 flex flex-col">
                  <p className="text-[0.8125rem] font-black tracking-tight leading-tight truncate">{item.label}</p>
                  <p className="text-[0.625rem] text-foreground/40 font-medium mt-0.5 truncate">{item.sub}</p>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings Button at Bottom */}
      <div className="mt-auto p-4 w-full flex flex-col gap-2 border-t-2 border-primary/10 bg-white/10">
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-3 brutal-btn bg-primary text-white p-3.5 transition-all duration-200 group w-full ${isCollapsed ? 'justify-center' : 'justify-start'}`}
        >
          <Settings className="w-5 h-5 shrink-0 group-hover:rotate-90 transition-transform duration-500" />
          {!isCollapsed && <p className="text-[0.6875rem] font-black uppercase tracking-[0.2em] truncate">Cài đặt</p>}
        </button>
        <button
          onClick={() => window.location.reload()}
          className={`flex items-center gap-3 brutal-btn bg-white text-primary p-3.5 transition-all duration-200 group w-full ${isCollapsed ? 'justify-center' : 'justify-start'}`}
        >
          <RefreshCw className="w-5 h-5 shrink-0 group-hover:rotate-180 transition-transform duration-500" />
          {!isCollapsed && <p className="text-[0.6875rem] font-black uppercase tracking-[0.2em] truncate">Làm mới</p>}
        </button>
      </div>
    </motion.div>
  );
}
