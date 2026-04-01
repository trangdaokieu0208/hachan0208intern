import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  subtitle?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon: Icon, iconColor, iconBgColor, subtitle, onClick }: StatCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`bg-white/65 backdrop-blur-2xl rounded-2xl p-4 shadow-soft border border-slate-900/10 transition-all group flex flex-col justify-between h-full relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Decorative Background Element */}
      <div className={`absolute -right-4 -bottom-4 w-16 h-16 ${iconBgColor} opacity-10 blur-xl rounded-full group-hover:scale-125 transition-transform duration-700`} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 ${iconBgColor} rounded-xl shadow-sm group-hover:rotate-6 transition-transform flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[0.5625rem] uppercase tracking-[0.15em] font-black text-slate-400">
              {title}
            </span>
            {onClick && <ArrowUpRight className="w-2.5 h-2.5 text-slate-300 mt-0.5 group-hover:text-primary transition-colors" />}
          </div>
        </div>
        
        <div className="space-y-0.5">
          <p className="text-[0.5625rem] font-bold uppercase text-slate-400 tracking-widest">{subtitle || 'Statistics'}</p>
          <div className="text-xl font-normal text-slate-900 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            {value}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
