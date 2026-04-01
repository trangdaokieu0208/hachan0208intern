import { Link, useLocation } from 'react-router';
import { LayoutGrid, Building2, Database, ShieldCheck, CreditCard, Table2, Bell, User, Settings } from 'lucide-react';
import { motion } from 'motion/react';

const navigationItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutGrid, path: '/' },
  { id: 'centers', label: 'Centers', icon: Building2, path: '/centers' },
  { id: 'master-ae', label: 'Master AE', icon: Database, path: '/master-ae' },
  { id: 'audit', label: 'Audit', icon: ShieldCheck, path: '/audit' },
  { id: 'payment', label: 'Payment', icon: CreditCard, path: '/payment' },
  { id: 'pivot', label: 'Pivot', icon: Table2, path: '/pivot' },
];

interface NavbarProps {
  onOpenSettings: () => void;
}

export function Navbar({ onOpenSettings }: NavbarProps) {
  const location = useLocation();

  return (
    <div className="h-16 flex items-center px-6 gap-8 bg-transparent shrink-0">
      {/* Nav items */}
      <nav className="flex items-center justify-center gap-2 flex-1">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.625rem] font-black uppercase tracking-[0.15em] transition-all duration-300 whitespace-nowrap group border-2 ${
                isActive
                  ? 'text-foreground bg-primary border-border shadow-hard-sm translate-y-[-1px]'
                  : 'text-foreground/60 border-transparent hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-foreground' : 'text-primary/70 group-hover:text-primary'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-2xl border-2 border-border/10 rounded-xl p-0.5 shadow-sm">
        <button className="p-1.5 text-foreground/40 hover:text-primary transition-all">
          <Bell className="w-4 h-4" />
        </button>
        <div className="h-7 w-7 bg-foreground rounded-lg flex items-center justify-center text-primary border-2 border-border/20 shadow-hard-sm cursor-pointer hover:scale-105 transition-transform">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
