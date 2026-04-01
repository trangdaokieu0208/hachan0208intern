import { useAppData } from '../lib/AppDataContext';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function LoadingWrapper({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAppData();

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">
                Đang tải dữ liệu...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
