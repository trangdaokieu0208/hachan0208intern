import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_CENTERS } from '../constants';
import localforage from 'localforage';
import { toast } from 'sonner';

// Configure localforage
localforage.config({
  name: 'PayrollApp',
  storeName: 'app_data'
});

export interface AppData {
  Fr_InputList: any[];
  Final_Centers: { headers: string[]; data: any[] };
  Final_AE: { headers: string[]; data: any[] };
  Bank_North_AE: { headers: string[]; data: any[] };
  Sheet1_AE: { headers: string[]; data: any[] };
  Hold_AE: { headers: string[]; data: any[] };
  SoSanh_AE: { headers: string[]; data: any[] };
  AuditReport: { headers: string[]; data: any[] };
  BankExport: { headers: string[]; data: any[] };
  CustomReport: { headers: string[]; data: any[] };
  AE_Map: Record<string, { name: string; bus: string }>;
  AE_AutoMappingRules: { pattern: string; name: string; bus: string }[];
  Ae_Global_Inputs: any[];
  PivotConfig: {
    headers: Record<string, string>;
    chargeCols: { key: string; code: string; label: string }[];
  };
  // Dữ liệu nguồn
  Q_Staff: any[];
  Q_Salary_Scale: any[];
  Q_Roster: any[];
  Timesheets: any[];
  updatedAt?: any;
}

const STORAGE_KEY = 'PayrollApp_Data';

const initialAppData: AppData = {
  Fr_InputList: [],
  Final_Centers: { headers: ["No", "L07", "Business", "ID Number", "Full name", "Salary Scale", "From", "To", "Bank Account Number", "Bank Name", "CITAD code", "TAX CODE", "Contract No", "CHARGE TO LXO", "CHARGE TO EC", "CHARGE TO PT-DEMO", "Charge MKT Local", "Charge Renewal Projects", "Charge Discovery Camp", "Charge Summer Outing", "TOTAL PAYMENT"], data: [] },
  Final_AE: { headers: ["No", "Mã AE", "Business", "ID Number", "Full name", "TOTAL PAYMENT"], data: [] },
  Bank_North_AE: { headers: ["No", "L07", "Business", "ID Number", "Full name", "Bank Account Number", "Bank", "Tháng", "TOTAL PAYMENT", "LOẠI CK", "Payment details"], data: [] },
  Sheet1_AE: { headers: ["No", "ID Number", "Full name", "Salary Scale", "From", "To", "Bank Account Number", "Bank Name", "CITAD code", "TAX CODE", "Contract No", "CHARGE TO LXO", "CHARGE TO EC", "CHARGE TO PT-DEMO", "Charge MKT Local", "Charge Renewal Projects", "Charge Discovery Camp", "Charge Summer Outing", "TOTAL PAYMENT", "L07", "Business"], data: [] },
  Hold_AE: { headers: ["No", "ID Number", "Full name", "L07", "Business", "Bank Account Number", "Bank", "Tháng", "LOẠI CK", "TAX CODE", "Contract No", "TOTAL PAYMENT", "CENTER NOTE", "Sheet Source", "Note"], data: [] },
  SoSanh_AE: { headers: ["ID Number", "Full name", "Sheet 1 AE", "Bank North AE", "Chênh Lệch"], data: [] },
  AuditReport: { headers: ["Khóa Cột So Sánh", "Mã AE", "Total (Bảng 1)", "Total (Bảng 2)", "Chênh Lệch"], data: [] },
  BankExport: { headers: ["Payment Serial Number", "Transaction Type Code", "Payment Type", "Customer Reference No", "Beneficiary Account No.", "Beneficiary Name", "Document ID", "Place of Issue", "ID Issuance Date", "Beneficiary Bank Swift Code / IFSC Code", "Transaction Currency", "Payment Amount", "Charge Type", "Payment details", "Beneficiary - Nick Name", "Beneficiary Addr. Line 1", "Beneficiary Addr. Line 2"], data: [] },
  CustomReport: { headers: ["STT", "Trung Tâm", "Tháng", "Tổng tiền", "Ghi chú"], data: [] },
  AE_Map: {},
  AE_AutoMappingRules: [],
  Ae_Global_Inputs: [],
  PivotConfig: {
    headers: {
      'Business': 'Business',
      'L07': 'Mã AE',
      'GRAND_TOTAL': 'GRAND TOTAL'
    },
    chargeCols: [
      { key: "CHARGE TO LXO", label: "CHARGE TO LXO", code: "04" },
      { key: "CHARGE TO EC", label: "CHARGE TO EC", code: "PSZINT-A1" },
      { key: "CHARGE TO PT-DEMO", label: "CHARGE TO PT-DEMO", code: "MAZINT-E1-LDEM01" },
      { key: "Charge MKT Local", label: "CHARGE MKT LOCAL", code: "E1" },
      { key: "Charge Renewal Projects", label: "CHARGE RENEWAL PROJECTS", code: "EFZZZZ-R3" },
      { key: "Charge Discovery Camp", label: "CHARGE DISCOVERY CAMP", code: "" },
      { key: "Charge Summer Outing", label: "CHARGE SUMMER OUTING", code: "" }
    ]
  },
  Q_Staff: [],
  Q_Salary_Scale: [],
  Q_Roster: [],
  Timesheets: []
};

const AppDataContext = createContext<{
  appData: AppData;
  updateAppData: (updater: (prev: AppData) => AppData, saveToHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSyncing: boolean;
  isLoading: boolean;
} | undefined>(undefined);

interface HistoryState {
  past: AppData[];
  present: AppData;
  future: AppData[];
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HistoryState>({
    past: [],
    present: initialAppData,
    future: []
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await localforage.getItem<AppData>(STORAGE_KEY);
        if (saved) {
          setState(prev => ({
            ...prev,
            present: {
              ...saved,
              Final_Centers: {
                ...saved.Final_Centers,
                headers: initialAppData.Final_Centers.headers
              }
            }
          }));
        } else {
          // Fallback to localStorage for migration if needed
          const legacySaved = localStorage.getItem(STORAGE_KEY);
          if (legacySaved) {
            try {
              const parsed = JSON.parse(legacySaved);
              setState(prev => ({
                ...prev,
                present: {
                  ...parsed,
                  Final_Centers: {
                    ...parsed.Final_Centers,
                    headers: initialAppData.Final_Centers.headers
                  }
                }
              }));
              // Migrate to localforage
              await localforage.setItem(STORAGE_KEY, parsed);
            } catch (e) {
              console.error('Failed to parse legacy data', e);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load app data from storage', e);
        toast.error('Không thể tải dữ liệu đã lưu.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Sync to Storage
  useEffect(() => {
    if (isLoading) return;

    const saveData = async () => {
      setIsSyncing(true);
      try {
        await localforage.setItem(STORAGE_KEY, state.present);
      } catch (e) {
        console.error('Failed to save app data to storage', e);
        // If localforage fails (e.g. IndexedDB full), try localStorage as last resort
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state.present));
        } catch (lsError) {
          console.error('LocalStorage also failed', lsError);
          toast.error('Không thể lưu dữ liệu: Bộ nhớ trình duyệt đã đầy.');
        }
      } finally {
        setIsSyncing(false);
      }
    };

    const timeoutId = setTimeout(saveData, 1000); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [state.present, isLoading]);

  const updateAppData = useCallback((updater: (prev: AppData) => AppData, saveToHistory: boolean = true) => {
    setState(prev => {
      const nextPresent = updater(prev.present);
      if (nextPresent === prev.present) return prev;
      
      return {
        past: saveToHistory ? [...prev.past, prev.present].slice(-20) : prev.past, // Limit history
        present: nextPresent,
        future: saveToHistory ? [] : prev.future
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.past.length === 0) return prev;
      
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.future.length === 0) return prev;
      
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  useEffect(() => {
    if (isLoading) return;
    
    // Only set default centers if Fr_InputList is empty
    setState(prev => {
      if (prev.present.Fr_InputList && prev.present.Fr_InputList.length > 0) return prev;
      
      return {
        ...prev,
        present: { 
          ...prev.present, 
          Fr_InputList: DEFAULT_CENTERS.map((item, idx) => ({ 
            ...item, 
            id: `default-${idx}`,
            status: 'ready' 
          })) 
        }
      };
    });
  }, [isLoading]);

  return (
    <AppDataContext.Provider value={{ 
      appData: state.present, 
      updateAppData, 
      undo, 
      redo, 
      canUndo: state.past.length > 0, 
      canRedo: state.future.length > 0,
      isSyncing,
      isLoading
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
