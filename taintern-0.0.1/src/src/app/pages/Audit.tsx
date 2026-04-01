import React, { useState, useCallback, useMemo } from 'react';
import { useAppData } from '../lib/AppDataContext';
import { ShieldCheck, PlayCircle, Trash2, Settings, Search, AlertCircle, ChevronLeft, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import { parseMoneyToNumber } from '../lib/data-utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { DataTable } from '../components/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
} as const;

export function Audit() {
  const { appData, updateAppData } = useAppData();
  const [src1, setSrc1] = useState<string>('Final_Centers');
  const [src2, setSrc2] = useState<string>('Sheet1_AE');
  const [currentSubTab, setCurrentSubTab] = useState<'AuditReport' | 'AuditSource1' | 'AuditSource2'>('AuditReport');

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const sourceOptions = [
    { value: 'Final_Centers', label: '1. Final Centers (Bảng Lương)' },
    { value: 'Sheet1_AE', label: '2. Sheet 1 AE (Final AE)' },
    { value: 'Bank_North_AE', label: '3. Bank North AE (Final AE)' },
    { value: 'Hold_AE', label: '4. Hold AE (Final AE)' },
    { value: 'SoSanh_AE', label: '5. So Sánh AE (Final AE)' },
  ];

  const handleRunAudit = useCallback(() => {
    const data1 = (appData as any)[src1]?.data || [];
    const data2 = (appData as any)[src2]?.data || [];

    if (!data1.length || !data2.length) {
      toast.error("Thiếu dữ liệu nguồn!");
      return;
    }

    const findCol = (row: any, patterns: string[]) => {
      if (!row) return null;
      const keys = Object.keys(row);
      for (const p of patterns) {
        const found = keys.find(k => k.toUpperCase().trim() === p.toUpperCase());
        if (found) return found;
      }
      for (const p of patterns) {
        const foundPartial = keys.find(k => k.toUpperCase().includes(p.toUpperCase()));
        if (foundPartial) return foundPartial;
      }
      return null;
    };

    const amtPatterns = ['TOTAL PAYMENT', 'TOTAL', 'THỰC NHẬN', 'AMOUNT', 'SỐ TIỀN', 'PAYMENT AMOUNT', 'TIỀN'];
    const amtKey1 = findCol(data1[0], amtPatterns);
    const amtKey2 = findCol(data2[0], amtPatterns);

    if (!amtKey1 || !amtKey2) {
      toast.error("Không tìm thấy cột 'Total Payment' (hoặc tương đương) ở một trong hai bảng!");
      return;
    }

    const keyPatterns = ['Mã AE', 'L07', 'CENTER', 'Centers', 'BUSINESS UNIT', 'MÃ CENTER'];
    const key1 = findCol(data1[0], keyPatterns);
    const key2 = findCol(data2[0], keyPatterns);

    const useKey = !!(key1 && key2);

    const aggregate = (data: any[], keyCol: string | null, amtCol: string) => {
      const map = new Map<string, { Key: string; Total: number }>();
      let grandTotal = 0;
      data.forEach(row => {
        const val = parseMoneyToNumber(row[amtCol]);
        grandTotal += val;
        
        const k = keyCol ? String(row[keyCol] || "Unknown").trim().toUpperCase() : "GRAND_TOTAL";
        
        if (!map.has(k)) map.set(k, { Key: k, Total: 0 });
        map.get(k)!.Total += val;
      });
      return { map, grandTotal };
    };

    const res1 = aggregate(data1, useKey ? key1 : null, amtKey1);
    const res2 = aggregate(data2, useKey ? key2 : null, amtKey2);

    const auditResults: any[] = [];
    const src1Label = sourceOptions.find(o => o.value === src1)?.label || src1;
    const src2Label = sourceOptions.find(o => o.value === src2)?.label || src2;

    if (useKey) {
      const allKeys = new Set([...res1.map.keys(), ...res2.map.keys()]);
      allKeys.forEach(k => {
        const v1 = res1.map.get(k)?.Total || 0;
        const v2 = res2.map.get(k)?.Total || 0;
        const diff = v2 - v1;
        
        if (Math.abs(diff) > 5) {
          const rowObj: any = {
            "Khóa Cột So Sánh": k,
            "Mã AE": k,
            "Chênh Lệch": diff
          };
          rowObj[`Total (${src1Label})`] = v1;
          rowObj[`Total (${src2Label})`] = v2;
          auditResults.push(rowObj);
        }
      });
    } else {
      const diff = res2.grandTotal - res1.grandTotal;
      if (Math.abs(diff) > 5) {
        const rowObj: any = {
          "Khóa Cột So Sánh": "TỔNG TOÀN BẢNG",
          "Mã AE": "-",
          "Chênh Lệch": diff
        };
        rowObj[`Total (${src1Label})`] = res1.grandTotal;
        rowObj[`Total (${src2Label})`] = res2.grandTotal;
        auditResults.push(rowObj);
      }
    }

    updateAppData(prev => ({
      ...prev,
      AuditReport: {
        headers: ["Khóa Cột So Sánh", "Mã AE", `Total (${src1Label})`, `Total (${src2Label})`, "Chênh Lệch"],
        data: auditResults
      }
    }));
    setCurrentSubTab('AuditReport');
  }, [appData, src1, src2, updateAppData]);

  const handleClearAudit = () => {
    updateAppData(prev => ({
      ...prev,
      AuditReport: { ...prev.AuditReport, data: [] }
    }));
    setShowClearDialog(false);
  };

  const getActiveData = () => {
    if (currentSubTab === 'AuditReport') return appData.AuditReport;
    if (currentSubTab === 'AuditSource1') return (appData as any)[src1] || { headers: [], data: [] };
    if (currentSubTab === 'AuditSource2') return (appData as any)[src2] || { headers: [], data: [] };
    return { headers: [], data: [] };
  };

  const activeData = getActiveData();

  const columns = useMemo(() => {
    return activeData.headers.map((header: string) => {
      let type: 'text' | 'number' | 'currency' = 'text';
      if (header.includes('Total') || header === 'Chênh Lệch') {
        type = 'currency';
      }
      return {
        key: header,
        label: header,
        type,
        sortable: true,
        filterable: true
      };
    });
  }, [activeData.headers]);

  const handleCellChange = (rowIndex: number, colKey: string, value: any) => {
    updateAppData(prev => {
      const targetTab = currentSubTab === 'AuditReport' ? 'AuditReport' : (currentSubTab === 'AuditSource1' ? src1 : src2);
      const newData = [...(prev as any)[targetTab].data];
      newData[rowIndex] = { ...newData[rowIndex], [colKey]: value };
      return { ...prev, [targetTab]: { ...(prev as any)[targetTab], data: newData } };
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    updateAppData(prev => {
      const targetTab = currentSubTab === 'AuditReport' ? 'AuditReport' : (currentSubTab === 'AuditSource1' ? src1 : src2);
      const newData = [...(prev as any)[targetTab].data];
      newData.splice(rowIndex, 1);
      return { ...prev, [targetTab]: { ...(prev as any)[targetTab], data: newData } };
    });
    toast.success('Đã xóa dòng dữ liệu');
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col h-full overflow-hidden bg-transparent p-1 gap-1"
    >
      {/* Integrated Header & Controls */}
      <div className="bg-white/65 backdrop-blur-2xl rounded-lg shadow-hard-xl flex flex-col overflow-hidden border-2 border-slate-900/10 shrink-0">
        <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-slate-900/10 bg-transparent shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border-2 border-primary/20 shadow-hard-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-primary tracking-tight uppercase leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Đối soát dữ liệu</h2>
              <p className="text-[0.625rem] font-bold text-primary/40 uppercase tracking-widest">Kiểm soát tài chính & Đối chiếu dữ liệu • {activeData.data.length} Bản ghi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showSearch && (
                <motion.div 
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  className="relative group"
                >
                  <input
                    type="text"
                    placeholder="TÌM KIẾM..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="brutal-input pl-10 pr-4 py-2 text-[0.75rem] w-64 uppercase font-black transition-all focus:w-80 bg-white/70 backdrop-blur-sm"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-primary/30 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center gap-1.5 bg-white/65 p-1.5 rounded-2xl border-2 border-primary/10 shadow-inner">
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Panel - Selection - More Compact */}
        <div className="w-72 bg-white/65 backdrop-blur-2xl rounded-lg p-4 flex flex-col gap-4 shadow-sm border border-slate-900/10 shrink-0">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[0.5625rem] font-black uppercase tracking-widest text-[#e086a3]">Nguồn 1 (Gốc)</label>
              <select 
                value={src1}
                onChange={(e) => setSrc1(e.target.value)}
                className="w-full p-3 bg-[#f1f5f9] border-none rounded-xl text-[0.6875rem] font-bold text-primary focus:ring-2 focus:ring-[#e086a3]/20 transition-all appearance-none cursor-pointer"
              >
                {sourceOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[0.5625rem] font-black uppercase tracking-widest text-[#e086a3]">Nguồn 2 (So sánh)</label>
              <select 
                value={src2}
                onChange={(e) => setSrc2(e.target.value)}
                className="w-full p-3 bg-[#f1f5f9] border-none rounded-xl text-[0.6875rem] font-bold text-primary focus:ring-2 focus:ring-[#e086a3]/20 transition-all appearance-none cursor-pointer"
              >
                {sourceOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={handleRunAudit}
            className="mt-auto w-full py-4 bg-[#e086a3] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#e086a3]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4" /> THỰC HIỆN
          </button>
        </div>

        {/* Right Panel - Results - Maximized Table */}
        <div className="flex-1 bg-white/65 backdrop-blur-2xl rounded-lg flex flex-col overflow-hidden shadow-sm border border-slate-900/10">
          {/* Tabs & Actions - More Compact */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-primary/5 shrink-0">
            <div className="flex gap-1.5">
              {[
                { id: 'AuditReport', label: 'Báo Cáo Đối Soát' },
                { id: 'AuditSource1', label: 'Xem Nguồn 1' },
                { id: 'AuditSource2', label: 'Xem Nguồn 2' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setCurrentSubTab(tab.id as any); }}
                  className={`px-4 py-2 text-[0.625rem] font-black uppercase tracking-widest rounded-full transition-all ${
                    currentSubTab === tab.id 
                      ? 'bg-[#e086a3] text-white shadow-md' 
                      : 'bg-[#f1f5f9] text-primary/30 hover:text-primary/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence>
                {showSearch && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    className="relative group"
                  >
                    <input
                      type="text"
                      placeholder="TÌM KIẾM..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="brutal-input pl-10 pr-4 py-2 text-xs w-64 uppercase font-black transition-all focus:w-80 bg-white/70 backdrop-blur-sm"
                      autoFocus
                    />
                    <Search className="w-4 h-4 text-primary/30 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex items-center gap-1.5 bg-white/65 p-1.5 rounded-2xl border-2 border-primary/10 shadow-inner">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2.5 border-2 border-primary rounded-xl bg-white text-primary hover:bg-primary hover:text-white transition-all shadow-hard-sm active:shadow-none active:translate-y-[1px] group">
                          <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Cài đặt & Thao tác</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-64 border-2 border-primary shadow-hard p-1.5">
                    <DropdownMenuLabel className="font-black uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">Thao tác</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />
                    
                    <DropdownMenuItem 
                      onClick={() => setShowSearch(!showSearch)}
                      className={`cursor-pointer font-black uppercase text-[0.6875rem] gap-3 p-2.5 rounded-xl transition-all ${showSearch ? 'bg-primary text-white shadow-hard-sm' : 'hover:bg-primary/5'}`}
                    >
                      <Search className="w-4 h-4" />
                      <span>{showSearch ? 'Ẩn tìm kiếm' : 'Hiện tìm kiếm'}</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />
                    
                    <DropdownMenuItem 
                      onClick={() => setShowClearDialog(true)}
                      className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 focus:bg-rose-50 text-rose-500 p-2.5 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Xóa báo cáo hiện tại</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Table Area - Maximized */}
          <div className="flex-1 overflow-hidden p-1">
            <div className="h-full rounded-lg overflow-hidden border border-slate-900/10 bg-transparent shadow-inner">
              {activeData.data.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-primary/10">
                  <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                    <Search className="w-10 h-10 text-[#e086a3]/40" />
                  </div>
                  <p className="font-black uppercase text-[1.125rem] tracking-tight text-[#e086a3]/60" style={{ fontFamily: "'Playfair Display', serif" }}>Không tìm thấy dữ liệu</p>
                  <p className="text-[0.5625rem] font-bold uppercase opacity-40 tracking-widest mt-1">Thử thay đổi bộ lọc hoặc từ khóa</p>
                </div>
              ) : (
                <DataTable 
                  columns={columns}
                  data={activeData.data}
                  onCellChange={handleCellChange}
                  onDeleteRow={handleDeleteRow}
                  isEditable={true}
                  externalSearchTerm={searchTerm}
                  onExternalSearchChange={setSearchTerm}
                  storageKey={`audit_${currentSubTab}`}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearAudit}
        title="Xác nhận xoá báo cáo"
        description="Bạn có chắc chắn muốn xóa toàn bộ dữ liệu trong báo cáo đối soát hiện tại? Hành động này không thể hoàn tác."
        confirmText="Xác nhận xoá"
        variant="destructive"
      />
    </motion.div>
  );
}
