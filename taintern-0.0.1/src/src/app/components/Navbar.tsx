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
              className={`relative flex items-center gap-2 px-4 py-2 rounded-2xl text-[0.6875rem] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap group ${
                isActive
                  ? 'text-primary bg-secondary/50 shadow-sm'
                  : 'text-muted-foreground hover:text-primary hover:bg-secondary/30'
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md border border-primary/10 rounded-2xl p-1 shadow-sm">
        <button className="p-2 text-muted-foreground hover:text-primary transition-all">
          <Bell className="w-4 h-4" />
        </button>
        <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center text-primary border border-primary/20 cursor-pointer hover:scale-105 transition-transform">
          <User className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
