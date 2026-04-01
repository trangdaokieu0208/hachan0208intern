import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppDataProvider } from './lib/AppDataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { LoadingWrapper } from './components/LoadingWrapper';
import localforage from 'localforage';
import { toast } from 'sonner';

export default function App() {
  useEffect(() => {
    const applySettings = (settings: any) => {
      const root = document.documentElement;
      
      if (settings.darkMode) {
        root.classList.add('dark');
        root.style.setProperty('--background', '#1A1A1A');
        root.style.setProperty('--foreground', '#F4F1E2');
        root.style.setProperty('--border', '#F4F1E2');
        root.style.setProperty('--primary', '#D8EBF9');
        root.style.setProperty('--secondary', '#D8EBF9');
      } else {
        root.classList.remove('dark');
        if (settings.bg) root.style.setProperty('--background', settings.bg);
        if (settings.text) root.style.setProperty('--foreground', settings.text);
        if (settings.border) root.style.setProperty('--border', settings.border);
        if (settings.accent) {
          root.style.setProperty('--primary', settings.accent);
          root.style.setProperty('--secondary', settings.accent);
        }
      }

      if (settings.headerBg) root.style.setProperty('--header-bg', settings.headerBg);
      if (settings.headerBgImage) {
        root.style.setProperty('--header-bg-image', `url(${settings.headerBgImage})`);
      }
      if (settings.sidebarBg) root.style.setProperty('--sidebar-bg', settings.sidebarBg);
      if (settings.sidebarBtnActive) root.style.setProperty('--sidebar-btn-active', settings.sidebarBtnActive);
      
      if (settings.bgImage && !settings.darkMode) {
        root.style.setProperty('--bg-image', `url(${settings.bgImage})`);
        root.style.setProperty('--bg-image-attachment', 'fixed');
        root.style.setProperty('--bg-image-opacity', ((settings.bgImageOpacity ?? 100) / 100).toString());
        if (settings.bgImageStyle === 'pattern-sm') {
          root.style.setProperty('--bg-image-size', '50px');
          root.style.setProperty('--bg-image-repeat', 'repeat');
          root.style.setProperty('--bg-image-position', 'top left');
        } else if (settings.bgImageStyle === 'pattern-md') {
          root.style.setProperty('--bg-image-size', '100px');
          root.style.setProperty('--bg-image-repeat', 'repeat');
          root.style.setProperty('--bg-image-position', 'top left');
        } else if (settings.bgImageStyle === 'pattern-lg') {
          root.style.setProperty('--bg-image-size', '200px');
          root.style.setProperty('--bg-image-repeat', 'repeat');
          root.style.setProperty('--bg-image-position', 'top left');
        } else if (settings.bgImageStyle === 'brand-stripes-purple') {
          root.style.setProperty('--bg-image', 'var(--pattern-stripes-purple)');
          root.style.setProperty('--bg-image-size', '20px 20px');
          root.style.setProperty('--bg-image-repeat', 'repeat');
        } else if (settings.bgImageStyle === 'brand-stripes-green') {
          root.style.setProperty('--bg-image', 'var(--pattern-stripes-green)');
          root.style.setProperty('--bg-image-size', '20px 20px');
          root.style.setProperty('--bg-image-repeat', 'repeat');
        } else if (settings.bgImageStyle === 'brand-stripes-brown') {
          root.style.setProperty('--bg-image', 'var(--pattern-stripes-brown)');
          root.style.setProperty('--bg-image-size', '20px 20px');
          root.style.setProperty('--bg-image-repeat', 'repeat');
        } else {
          root.style.setProperty('--bg-image-size', 'cover');
          root.style.setProperty('--bg-image-repeat', 'no-repeat');
          root.style.setProperty('--bg-image-position', 'center');
        }
      } else {
        root.style.removeProperty('--bg-image');
        root.style.removeProperty('--bg-image-size');
        root.style.removeProperty('--bg-image-repeat');
        root.style.removeProperty('--bg-image-position');
        root.style.removeProperty('--bg-image-attachment');
        root.style.removeProperty('--bg-image-opacity');
      }

      if (settings.font) root.style.setProperty('--font-main', settings.font);
      if (settings.fontSize) root.style.setProperty('--font-size', settings.fontSize);
      if (settings.tablePadding) root.style.setProperty('--table-padding', settings.tablePadding);
      if (settings.radius) root.style.setProperty('--radius', settings.radius);
      if (settings.titleAlign) {
        const [flexAlign, textAlign] = settings.titleAlign.split('|');
        root.style.setProperty('--title-align', flexAlign);
        root.style.setProperty('--text-align', textAlign);
      }
      
      if (settings.sidebarPos === 'right') {
        document.body.classList.add('sidebar-right');
      } else {
        document.body.classList.remove('sidebar-right');
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'PayrollApp_UiSettings_small' && e.newValue) {
        try {
          applySettings(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const loadAndApply = async () => {
      // 1. Try fast load from localStorage (small settings only)
      const fastSaved = localStorage.getItem('PayrollApp_UiSettings_small');
      if (fastSaved) {
        try {
          applySettings(JSON.parse(fastSaved));
        } catch (e) {}
      } else {
        // Fallback to legacy full settings in localStorage
        const legacySaved = localStorage.getItem('PayrollApp_UiSettings');
        if (legacySaved) {
          try {
            applySettings(JSON.parse(legacySaved));
          } catch (e) {}
        }
      }

      // 2. Load full settings from localforage (including images)
      try {
        const fullSaved = await localforage.getItem('PayrollApp_UiSettings');
        if (fullSaved) {
          applySettings(fullSaved);
        }
      } catch (e) {
        console.error('Failed to load full UI settings', e);
        toast.error('Lỗi khi tải cài đặt');
      }
    };

    loadAndApply();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AppDataProvider>
        <LoadingWrapper>
          <RouterProvider router={router} />
        </LoadingWrapper>
        <Toaster position="top-right" richColors />
      </AppDataProvider>
    </ErrorBoundary>
  );
}

