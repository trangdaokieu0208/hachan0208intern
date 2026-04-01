import React, { useState, useEffect } from 'react';
import { X, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import localforage from 'localforage';

interface UiSettings {
  bg: string;
  bgImage: string;
  bgImageStyle?: 'cover' | 'pattern-sm' | 'pattern-md' | 'pattern-lg' | 'brand-stripes-purple' | 'brand-stripes-green' | 'brand-stripes-brown';
  bgImageOpacity?: number;
  accent: string;
  text: string;
  border: string;
  font: string;
  fontSize: string;
  tablePadding: string;
  sidebarPos: 'left' | 'right';
  radius: string;
  titleAlign: string;
  headerTitleColor?: string;
  // Functional Settings
  darkMode?: boolean;
  autoSave?: boolean;
  showHelp?: boolean;
}

const defaultSettings: UiSettings = {
  bg: '#F5F1E2',
  bgImage: '',
  bgImageStyle: 'cover',
  bgImageOpacity: 100,
  accent: '#E594A5',
  text: '#4A4A4A',
  border: '#D1C4E9',
  font: "'Inter', sans-serif",
  fontSize: '16px',
  tablePadding: '12px 16px',
  sidebarPos: 'left',
  radius: '16px',
  titleAlign: 'flex-start|left',
  headerTitleColor: '#4A4A4A',
  darkMode: false,
  autoSave: true,
  showHelp: true
};

const UI_SETTINGS_KEY = 'PayrollApp_UiSettings';

export function UiSettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<UiSettings>(defaultSettings);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await localforage.getItem<UiSettings>(UI_SETTINGS_KEY);
        if (saved) {
          setSettings({ ...defaultSettings, ...saved });
        } else {
          // Fallback to localStorage
          const legacySaved = localStorage.getItem(UI_SETTINGS_KEY);
          if (legacySaved) {
            try {
              const parsed = JSON.parse(legacySaved);
              setSettings({ ...defaultSettings, ...parsed });
              await localforage.setItem(UI_SETTINGS_KEY, parsed);
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error('Failed to load UI settings', e);
      }
    };
    
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const saveSettings = async () => {
    toast.info('Đang lưu cài đặt...');
    try {
      await localforage.setItem(UI_SETTINGS_KEY, settings);
      // Also save non-image settings to localStorage for faster initial load if possible
      const { bgImage, headerBgImage, ...smallSettings } = settings;
      localStorage.setItem(UI_SETTINGS_KEY + '_small', JSON.stringify(smallSettings));
      toast.success('Đã lưu cài đặt!');
    } catch (e) {
      console.error('Failed to save UI settings', e);
      toast.error('Không thể lưu cài đặt.');
      return;
    }

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
    if (settings.accent) {
      root.style.setProperty('--primary', settings.accent);
      root.style.setProperty('--secondary', settings.accent);
    }
    if (settings.text) {
      root.style.setProperty('--foreground', settings.text);
    }
    if (settings.border) {
      root.style.setProperty('--border', settings.border);
      root.style.setProperty('--shadow-hard', `4px 4px 0px ${settings.border}`);
      root.style.setProperty('--shadow-hard-sm', `2px 2px 0px ${settings.border}`);
    }
    if (settings.font) root.style.setProperty('--font-main', settings.font);
    if (settings.fontSize) root.style.setProperty('--font-size', settings.fontSize);
    if (settings.tablePadding) root.style.setProperty('--table-padding', settings.tablePadding);
    if (settings.radius) root.style.setProperty('--radius', settings.radius);
    if (settings.headerTitleColor) root.style.setProperty('--header-title-color', settings.headerTitleColor);
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

    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    onClose();
  };

  const resetSettings = async () => {
    toast.info('Đang reset cài đặt...');
    setSettings(defaultSettings);
    await localforage.removeItem(UI_SETTINGS_KEY);
    localStorage.removeItem(UI_SETTINGS_KEY);
    localStorage.removeItem(UI_SETTINGS_KEY + '_small');
    toast.success('Đã reset cài đặt!');
    onClose();
    const root = document.documentElement;
    root.style.removeProperty('--background');
    root.style.removeProperty('--bg-image');
    root.style.removeProperty('--bg-image-size');
    root.style.removeProperty('--bg-image-repeat');
    root.style.removeProperty('--bg-image-position');
    root.style.removeProperty('--bg-image-attachment');
    root.style.removeProperty('--bg-image-opacity');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--foreground');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--border');
    root.style.removeProperty('--shadow-hard');
    root.style.removeProperty('--shadow-hard-sm');
    root.style.removeProperty('--font-main');
    root.style.removeProperty('--font-size');
    root.style.removeProperty('--table-padding');
    root.style.removeProperty('--radius');
    root.style.removeProperty('--header-title-color');
    root.style.removeProperty('--title-align');
    root.style.removeProperty('--text-align');
    document.body.classList.remove('sidebar-right');
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'bg' | 'header' = 'bg') => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'bg') {
          setSettings({ ...settings, bgImage: reader.result as string });
        } else {
          setSettings({ ...settings, headerBgImage: reader.result as string });
        }
      };
      reader.onerror = () => {
        toast.error('Có lỗi khi đọc file ảnh.');
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-white/90 backdrop-blur-md shadow-[-4px_0px_0px_rgba(0,0,0,1)] z-[10000] flex flex-col animate-in slide-in-from-right-full duration-300">
      <div className="p-4 flex justify-between items-center bg-background">
        <h3 className="font-black text-lg uppercase flex items-center gap-2 text-primary">
          <Settings2 className="w-5 h-5" /> Cài đặt Giao diện
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-primary/10 rounded-lg border-2 border-transparent hover:border-primary transition-all text-primary">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6 bg-white/50 text-primary hide-scrollbar">
        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-primary/50 tracking-widest uppercase border-b-2 border-primary/10 pb-1">1. MÀU SẮC & NỀN (COLORS & BG)</h4>
          <div className="flex flex-col gap-2">
            <label className="font-bold text-[0.8125rem]">Ảnh nền (Background Image)</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer bg-white border-2 border-primary rounded-lg p-2 text-center text-xs font-bold shadow-hard-sm hover:bg-primary/5 transition-all">
                {settings.bgImage ? 'Đổi ảnh nền' : 'Tải ảnh lên'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'bg')} />
              </label>
              {settings.bgImage && (
                <button 
                  onClick={() => setSettings({...settings, bgImage: ''})}
                  className="p-2 border-2 border-destructive text-destructive rounded-lg shadow-hard-sm hover:bg-destructive/10 transition-all"
                  title="Xóa ảnh nền"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {settings.bgImage && (
              <>
                <div className="h-24 w-full rounded-lg mt-1" 
                  style={{ 
                    backgroundImage: `url(${settings.bgImage})`,
                    backgroundSize: settings.bgImageStyle === 'pattern-sm' ? '25px' : settings.bgImageStyle === 'pattern-md' ? '50px' : settings.bgImageStyle === 'pattern-lg' ? '100px' : 'cover',
                    backgroundRepeat: settings.bgImageStyle?.startsWith('pattern') ? 'repeat' : 'no-repeat',
                    backgroundPosition: settings.bgImageStyle?.startsWith('pattern') ? 'top left' : 'center'
                  }} 
                />
                <div className="flex flex-col gap-1 mt-1">
                  <label className="font-bold text-[0.8125rem]">Kiểu hiển thị ảnh</label>
                  <select 
                    value={settings.bgImageStyle || 'cover'} 
                    onChange={e => setSettings({...settings, bgImageStyle: e.target.value as any})} 
                    className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white"
                  >
                    <option value="cover">Lấp đầy màn hình (Cover)</option>
                    <option value="pattern-sm">Nhân bản (Nhỏ - 50px)</option>
                    <option value="pattern-md">Nhân bản (Vừa - 100px)</option>
                    <option value="pattern-lg">Nhân bản (Lớn - 200px)</option>
                    <option value="brand-stripes-purple">Brand: Sọc Tím</option>
                    <option value="brand-stripes-green">Brand: Sọc Xanh</option>
                    <option value="brand-stripes-brown">Brand: Sọc Nâu</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-[0.8125rem]">Độ đậm nhạt của ảnh</label>
                    <span className="text-xs font-bold">{settings.bgImageOpacity ?? 100}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={settings.bgImageOpacity ?? 100} 
                    onChange={e => setSettings({...settings, bgImageOpacity: Number(e.target.value)})}
                    className="w-full accent-primary"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label className="font-bold text-[0.8125rem]">Màu nhấn (Accent/Table)</label>
            <input type="color" value={settings.accent} onChange={e => setSettings({...settings, accent: e.target.value})} className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm" />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-bold text-[0.8125rem]">Màu chữ (Text)</label>
            <input type="color" value={settings.text} onChange={e => setSettings({...settings, text: e.target.value})} className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm" />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-bold text-[0.8125rem]">Màu chữ Tiêu đề (Header Title)</label>
            <input type="color" value={settings.headerTitleColor || '#513229'} onChange={e => setSettings({...settings, headerTitleColor: e.target.value})} className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm" />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-bold text-[0.8125rem]">Viền & Đổ bóng (Border)</label>
            <input type="color" value={settings.border} onChange={e => setSettings({...settings, border: e.target.value})} className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-primary/50 tracking-widest uppercase border-b-2 border-primary/10 pb-1">2. FONT CHỮ & HIỂN THỊ</h4>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[0.8125rem]">Font chữ hệ thống</label>
            <select value={settings.font} onChange={e => setSettings({...settings, font: e.target.value})} className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white">
              <option value="'Nunito', sans-serif">Nunito (Mềm mại)</option>
              <option value="'Inter', sans-serif">Inter (Chuyên nghiệp)</option>
              <option value="'Roboto', sans-serif">Roboto (Cổ điển)</option>
              <option value="'Montserrat', sans-serif">Montserrat (Đậm nét)</option>
              <option value="'Quicksand', sans-serif">Quicksand (Tròn trịa)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[0.8125rem]">Cỡ chữ hệ thống (Font Size)</label>
            <select value={settings.fontSize} onChange={e => setSettings({...settings, fontSize: e.target.value})} className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white">
              <option value="12px">Rất nhỏ (Tiny - 12px)</option>
              <option value="14px">Nhỏ (Small - 14px)</option>
              <option value="16px">Tiêu chuẩn (Normal - 16px)</option>
              <option value="18px">Lớn (Large - 18px)</option>
              <option value="20px">Rất lớn (Extra Large - 20px)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[0.8125rem]">Mật độ Bảng (Table Padding)</label>
            <select value={settings.tablePadding} onChange={e => setSettings({...settings, tablePadding: e.target.value})} className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white">
              <option value="8px 10px">Thu gọn (Compact)</option>
              <option value="12px 16px">Tiêu chuẩn (Normal)</option>
              <option value="16px 24px">Thoải mái (Relaxed)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-primary/50 tracking-widest uppercase border-b-2 border-primary/10 pb-1">3. BỐ CỤC (LAYOUT)</h4>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[0.8125rem]">Vị trí Sidebar Menu</label>
            <select value={settings.sidebarPos} onChange={e => setSettings({...settings, sidebarPos: e.target.value as 'left' | 'right'})} className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white">
              <option value="left">Trái (Left)</option>
              <option value="right">Phải (Right)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[0.8125rem]">Độ bo góc (Border Radius)</label>
            <select value={settings.radius} onChange={e => setSettings({...settings, radius: e.target.value})} className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white">
              <option value="0px">Vuông góc (Sharp - 0px)</option>
              <option value="8px">Bo nhẹ (Slight - 8px)</option>
              <option value="12px">Bo chuẩn (Normal - 12px)</option>
              <option value="16px">Bo tròn nhiều (Rounded - 16px)</option>
              <option value="999px">Hình viên thuốc (Pill)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[0.8125rem]">Căn lề Tiêu đề (Header Title)</label>
            <select value={settings.titleAlign} onChange={e => setSettings({...settings, titleAlign: e.target.value})} className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white">
              <option value="flex-start|left">Căn Trái</option>
              <option value="center|center">Căn Giữa</option>
              <option value="flex-end|right">Căn Phải</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-primary/50 tracking-widest uppercase border-b-2 border-primary/10 pb-1">4. CHỨC NĂNG HỆ THỐNG (SYSTEM)</h4>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[0.8125rem]">Chế độ Tối (Dark Mode)</label>
              <input 
                type="checkbox" 
                checked={settings.darkMode} 
                onChange={e => setSettings({...settings, darkMode: e.target.checked})}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="font-bold text-[0.8125rem]">Tự động lưu (Auto-save)</label>
              <input 
                type="checkbox" 
                checked={settings.autoSave} 
                onChange={e => setSettings({...settings, autoSave: e.target.checked})}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="font-bold text-[0.8125rem]">Hiển thị Trợ giúp (Show Help)</label>
              <input 
                type="checkbox" 
                checked={settings.showHelp} 
                onChange={e => setSettings({...settings, showHelp: e.target.checked})}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex gap-3 bg-background">
        <button onClick={saveSettings} className="flex-1 text-primary-foreground py-2.5 rounded-xl font-bold border-2 border-primary shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all bg-primary">Lưu Lại</button>
        <button onClick={resetSettings} className="flex-1 bg-white text-primary py-2.5 rounded-xl font-bold border-2 border-primary hover:bg-primary/5 shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">Mặc định</button>
      </div>
    </div>
  );
}
