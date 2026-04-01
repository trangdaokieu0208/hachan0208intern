import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Navbar } from '../components/Navbar';
import { LeftSidebar } from '../components/LeftSidebar';
import { UiSettingsModal } from '../components/UiSettingsModal';
import { motion, AnimatePresence } from 'motion/react';

export function Root() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden font-sans text-foreground bg-pattern">
      {/* Left Sidebar */}
      <LeftSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {/* Top Navbar */}
        <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="h-full overflow-hidden"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Overlays */}
        <UiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </div>
  );
}
