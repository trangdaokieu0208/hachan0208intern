import { useState, useMemo, useRef, useCallback } from 'react';
import { useAppData } from '../lib/AppDataContext';
import { FileText, Landmark, PauseCircle, Diff, Trash2, Settings, Download, Upload, Search, Users, FileSpreadsheet, ChevronLeft, ChevronRight, ChevronDown, CheckSquare, RefreshCw, Plus, Import, Save, Loader2, AlertCircle } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
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
import * as XLSX from 'xlsx';
import { parseMoneyToNumber, removeVietnameseTones, findColumnMapping, cleanText, isMoneyColumn } from '../lib/data-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
} as const;

export function MasterAE() {
  const { appData, updateAppData } = useAppData();
  const [activeTab, setActiveTab] = useState<'Sheet1_AE' | 'Bank_North_AE' | 'Hold_AE' | 'SoSanh_AE' | 'CustomReport'>('Sheet1_AE');

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearch, setImportSearch] = useState('');

  const tabs = [
    { id: 'Sheet1_AE', label: 'Sheet 1 AE', icon: FileText },
    { id: 'Bank_North_AE', label: 'Bank North AE', icon: Landmark },
    { id: 'Hold_AE', label: 'Hold AE', icon: PauseCircle },
    { id: 'SoSanh_AE', label: 'So Sánh AE', icon: Diff },
    { id: 'CustomReport', label: 'Báo Cáo Tùy Chỉnh', icon: FileSpreadsheet },
  ] as const;

  const currentData = appData[activeTab];

  const columns = useMemo(() => {
    return currentData.headers
      .filter(h => h.toUpperCase() !== 'NO')
      .map(header => {
        const h = header.toUpperCase();
        let type: 'text' | 'number' | 'currency' = 'text';
        if (h.includes('TOTAL') || h.includes('CHARGE') || h.includes('PAYMENT') || h.includes('AE') || h.includes('LỆCH') || h.includes('TIỀN')) {
          if (!(h.includes('ID') || h.includes('ACCOUNT') || h.includes('NUMBER') || h.includes('CODE') || h.includes('STK'))) {
            type = 'currency';
          }
        }
        return {
          key: header,
          label: header,
          type,
          sortable: true,
          filterable: true
        };
      });
  }, [currentData.headers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const tableRef = useRef<any>(null);
  const [, setUpdateTrigger] = useState(0);

  const handleCellChange = (row: any, colKey: string, value: any) => {
    updateAppData(prev => {
      const newData = [...prev[activeTab].data];
      const rowIndex = newData.findIndex(r => r === row || (r.id && r.id === row.id) || (r.No && r.No === row.No) || (r.STT && r.STT === row.STT));
      if (rowIndex === -1) return prev;
      newData[rowIndex] = { ...newData[rowIndex], [colKey]: value };
      return { ...prev, [activeTab]: { ...prev[activeTab], data: newData } };
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    updateAppData(prev => {
      const newData = [...prev[activeTab].data];
      newData.splice(rowIndex, 1);
      // Re-index "No" or "STT" if it exists
      const reindexedData = newData.map((row, idx) => {
        if ("No" in row) return { ...row, "No": idx + 1 };
        if ("STT" in row) return { ...row, "STT": idx + 1 };
        return row;
      });
      return { ...prev, [activeTab]: { ...prev[activeTab], data: reindexedData } };
    });
    toast.success('Đã xóa dòng dữ liệu');
  };

  const handleExportExcel = () => {
    if (currentData.data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(currentData.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `Master_AE_${activeTab}.xlsx`);
  };

  const updateAeMapFromList = useCallback(() => {
    let aeMap: Record<string, { name: string; bus: string }> = {};
    if (appData.Fr_InputList) {
      appData.Fr_InputList.forEach(item => {
        if (item.aeCode) {
          const code = String(item.aeCode).trim().toLowerCase();
          if (code) {
            aeMap[code] = { name: item.l07, bus: item.bus };
          }
        }
        if (item.l07) {
          const l07Key = String(item.l07).trim().toLowerCase();
          if (l07Key && !aeMap[l07Key]) {
            aeMap[l07Key] = { name: item.l07, bus: item.bus };
          }
        }
      });
    }
    return aeMap;
  }, [appData.Fr_InputList]);

  const processAEData = async () => {
    const targets = appData.Ae_Global_Inputs.filter(item => item.fileObj);
    if (targets.length === 0) {
      toast.error("Vui lòng chọn File AE Final trong phần Cấu hình!");
      return;
    }

    const aeMap = updateAeMapFromList();
    setIsProcessing(true);
    toast.info("Đang xử lý dữ liệu AE...");

    try {
      let bankData: any[] = [];
      let sheet1Data: any[] = [];
      let holdData: any[] = [];
      let soSanhAeData: any[] = [];
      
      const sheet1Headers = [
        "No", "ID Number", "Full name", "Salary Scale", "From", "To",
        "Bank Account Number", "Bank Name", "CITAD code", "TAX CODE",
        "Contract No", "CHARGE TO LXO", "CHARGE TO EC", "CHARGE TO PT-DEMO",
        "Charge MKT Local", "Charge Renewal Projects", "Charge Discovery Camp",
        "Charge Summer Outing", "TOTAL PAYMENT", "L07", "Business"
      ];

      for (const item of targets) {
        if (!item.fileObj) continue;
        const buf = await item.fileObj.arrayBuffer();
        const wb = XLSX.read(buf);

        // Optimized: Only process relevant sheets
        const relevantSheets = wb.SheetNames.filter(name => {
          const n = name.toUpperCase();
          return n.includes("BANK") || n.includes("NGÂN HÀNG") || 
                 n.includes("SHEET 1") || n.includes("SHEET1") || 
                 n.includes("HOLD") || n.includes("SO SÁNH AE");
        });

        for (const sheetName of relevantSheets) {
          const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "", raw: false });
          if (rows.length <= 2) continue;
          const nameUpper = sheetName.toUpperCase();

          // BANK SHEET
          if (nameUpper.includes("BANK") || nameUpper.includes("NGÂN HÀNG")) {
            let headerRowIndex = -1;
            for (let r = 0; r < Math.min(30, rows.length); r++) {
              let rowStr = rows[r].map(c => String(c).toUpperCase()).join(" ");
              if ((rowStr.includes("FULL NAME") || rowStr.includes("HỌ VÀ TÊN")) && 
                  (rowStr.includes("ACCOUNT") || rowStr.includes("SỐ TÀI KHOẢN") || rowStr.includes("STK"))) {
                headerRowIndex = r; break;
              }
            }
            if (headerRowIndex !== -1) {
              const h = rows[headerRowIndex] as string[];
              const colMap = findColumnMapping(h, ["STT", "ID NUMBER", "FULL NAME", "BANK ACCOUNT NUMBER", "TOTAL PAYMENT", "PAYMENT DETAILS"], item.columnMapping);
              
              for (let r = headerRowIndex + 1; r < rows.length; r++) {
                const row = rows[r];
                const totalVal = colMap["TOTAL PAYMENT"] !== -1 ? parseMoneyToNumber(row[colMap["TOTAL PAYMENT"]]) : 0;
                const nameVal = colMap["FULL NAME"] !== -1 ? String(row[colMap["FULL NAME"]]).trim() : "";
                
                if (totalVal === 0 && !nameVal) continue;

                const acc = colMap["BANK ACCOUNT NUMBER"] !== -1 ? String(row[colMap["BANK ACCOUNT NUMBER"]]).replace(/\s/g, '') : "";
                let type = "Liên ngân hàng";
                if (!acc) type = "⚠️ Thiếu STK";
                else if (acc.length < 6 || acc.length > 25) type = "⚠️ Sai độ dài";
                else if (acc.startsWith("0") || acc.startsWith("10")) type = "Nội bộ VCB";

                bankData.push({
                  "No": bankData.length + 1,
                  "ID Number": colMap["ID NUMBER"] !== -1 ? String(row[colMap["ID NUMBER"]]).trim() : "",
                  "Full name": nameVal,
                  "Bank Account Number": acc,
                  "TOTAL PAYMENT": totalVal,
                  "LOẠI CK": type,
                  "Payment details": colMap["PAYMENT DETAILS"] !== -1 ? String(row[colMap["PAYMENT DETAILS"]]).trim() : "",
                  "Bank": item.bank || "",
                  "Tháng": item.month || ""
                });
              }
            }
          }

          // HOLD SHEET
          if (nameUpper.includes("HOLD")) {
            let headerRowIndex = -1;
            for (let r = 0; r < Math.min(30, rows.length); r++) {
              let rowStr = rows[r].map(c => String(c).toUpperCase()).join(" ");
              if ((rowStr.includes("FULL NAME") || rowStr.includes("HỌ VÀ TÊN")) && 
                  (rowStr.includes("ACCOUNT") || rowStr.includes("SỐ TÀI KHOẢN") || rowStr.includes("STK"))) {
                headerRowIndex = r; break;
              }
            }

            if (headerRowIndex !== -1) {
              const h = rows[headerRowIndex] as string[];
              const colMap = findColumnMapping(h, ["ID NUMBER", "FULL NAME", "BANK ACCOUNT NUMBER", "TAX CODE", "CONTRACT NO", "TOTAL PAYMENT", "CENTER NOTE", "NOTE"], item.columnMapping);
              
              for (let r = headerRowIndex + 1; r < rows.length; r++) {
                const row = rows[r];
                const idVal = colMap["ID NUMBER"] !== -1 ? String(row[colMap["ID NUMBER"]]).trim() : "";
                const nameVal = colMap["FULL NAME"] !== -1 ? String(row[colMap["FULL NAME"]]).trim() : "";
                const totalVal = colMap["TOTAL PAYMENT"] !== -1 ? parseMoneyToNumber(row[colMap["TOTAL PAYMENT"]]) : 0;
                
                if (!idVal && !nameVal && totalVal === 0) continue;

                holdData.push({
                  "No": holdData.length + 1,
                  "ID Number": idVal,
                  "Full name": nameVal,
                  "Bank Account Number": colMap["BANK ACCOUNT NUMBER"] !== -1 ? String(row[colMap["BANK ACCOUNT NUMBER"]]).trim() : "",
                  "TAX CODE": colMap["TAX CODE"] !== -1 ? String(row[colMap["TAX CODE"]]).trim() : "",
                  "Contract No": colMap["CONTRACT NO"] !== -1 ? String(row[colMap["CONTRACT NO"]]).trim() : "",
                  "TOTAL PAYMENT": totalVal,
                  "CENTER NOTE": colMap["CENTER NOTE"] !== -1 ? String(row[colMap["CENTER NOTE"]]).trim() : "",
                  "Sheet Source": sheetName,
                  "Note": colMap["NOTE"] !== -1 ? String(row[colMap["NOTE"]]).trim() : ""
                });
              }
            }
          }

          // SHEET 1
          if (nameUpper.includes("SHEET 1") || nameUpper.includes("SHEET1")) {
            let headerRowIndex = -1;
            for (let r = 0; r < Math.min(30, rows.length); r++) {
              let rowStr = rows[r].map(c => String(c).toUpperCase()).join(" ");
              let matchCount = 0;
              if (rowStr.includes("FULL NAME") || rowStr.includes("HỌ VÀ TÊN")) matchCount++;
              if (rowStr.includes("ID NUMBER") || rowStr.includes("MÃ NV")) matchCount++;
              if (rowStr.includes("TOTAL PAYMENT") || rowStr.includes("THỰC NHẬN")) matchCount++;
              if (matchCount >= 2) { headerRowIndex = r; break; }
            }

            if (headerRowIndex !== -1) {
              const h = rows[headerRowIndex] as string[];
              const colMap = findColumnMapping(h, sheet1Headers, item.columnMapping);
              
              let centerColIndex = h.findIndex(x => {
                let v = String(x).trim().toUpperCase();
                const mappedCenter = item.columnMapping?.["Center"]?.toUpperCase().trim();
                if (mappedCenter && v === mappedCenter) return true;
                return v === "CENTER" || v.includes("COST CENTER") || v.includes("TRUNG TÂM") || v.includes("AE CODE") || v === "AE" || v.includes("MÃ AE");
              });

              for (let r = headerRowIndex + 1; r < rows.length; r++) {
                const row = rows[r];
                const totalVal = colMap["TOTAL PAYMENT"] !== -1 ? parseMoneyToNumber(row[colMap["TOTAL PAYMENT"]]) : 0;
                const accVal = colMap["Bank Account Number"] !== -1 ? String(row[colMap["Bank Account Number"]]).trim() : "";
                const nameVal = colMap["Full name"] !== -1 ? String(row[colMap["Full name"]]).trim() : "";

                if ((accVal !== "" || totalVal !== 0) && nameVal !== "") {
                  let obj: any = {};
                  sheet1Headers.forEach(th => {
                    if (th === "L07" || th === "Business") return;
                    const idx = colMap[th];
                    let val = (idx !== -1 && row[idx] !== undefined) ? row[idx] : "";
                    
                    if (isMoneyColumn(th)) {
                      val = parseMoneyToNumber(val);
                    }
                    
                    obj[th] = val;
                  });

                  const rawCenterVal = String(row[centerColIndex] || "").trim();
                  obj["_rawAE"] = rawCenterVal;
                  const rawCenterKey = rawCenterVal.toLowerCase();

                  if (aeMap[rawCenterKey]) {
                    obj["L07"] = aeMap[rawCenterKey].name;
                    obj["Business"] = aeMap[rawCenterKey].bus;
                  } else {
                    obj["L07"] = rawCenterVal + " (Chưa Map)";
                    obj["Business"] = "";
                  }
                  sheet1Data.push(obj);
                }
              }
            }
          }
        }
      }

      // Deduplicate and Save
      const deduplicate = (data: any[], keys: string[]) => {
        const seen = new Set();
        return data.filter(row => {
          const key = keys.map(k => String(row[k] || "").trim()).join("|");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      const finalSheet1 = deduplicate(sheet1Data, ["ID Number", "L07", "TOTAL PAYMENT"]);
      const finalBank = deduplicate(bankData, ["ID Number", "Bank Account Number", "TOTAL PAYMENT"]);
      const finalHold = deduplicate(holdData, ["ID Number", "TOTAL PAYMENT"]);

      updateAppData(prev => ({
        ...prev,
        Sheet1_AE: { ...prev.Sheet1_AE, data: finalSheet1 },
        Bank_North_AE: { ...prev.Bank_North_AE, data: finalBank },
        Hold_AE: { ...prev.Hold_AE, data: finalHold }
      }));

      toast.success(`Xử lý xong: ${finalSheet1.length} Sheet1, ${finalBank.length} Bank, ${finalHold.length} Hold.`);
      setActiveTab('Sheet1_AE');

    } catch (error: any) {
      console.error(error);
      toast.error("Lỗi xử lý file: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const reMapAECodes = () => {
    const aeMap = updateAeMapFromList();
    let count = 0;

    updateAppData(prev => {
      const newData = prev.Sheet1_AE.data.map(row => {
        const rawCenterVal = row["_rawAE"] || (row["L07"] ? row["L07"].replace(" (Chưa Map)", "") : "");
        if (rawCenterVal) {
          const rawCenterKey = rawCenterVal.toLowerCase();
          if (aeMap[rawCenterKey]) {
            count++;
            return { ...row, L07: aeMap[rawCenterKey].name, Business: aeMap[rawCenterKey].bus };
          }
        }
        return row;
      });
      return { ...prev, Sheet1_AE: { ...prev.Sheet1_AE, data: newData } };
    });

    toast.success(`Đã cập nhật mapping cho ${count} dòng dữ liệu.`);
  };

  const addCustomRow = () => {
    updateAppData(prev => {
      const newRow: any = { "STT": prev.CustomReport.data.length + 1 };
      prev.CustomReport.headers.forEach(h => { if (h !== "STT") newRow[h] = ""; });
      return { ...prev, CustomReport: { ...prev.CustomReport, data: [newRow, ...prev.CustomReport.data] } };
    });
    toast.success("Đã thêm dòng mới vào Báo cáo tùy chỉnh");
  };

  const importL07ToCustomRow = (l07: string) => {
    const sameL07Rows = appData.Sheet1_AE.data.filter(r => r['L07'] === l07);
    const totalPayment = sameL07Rows.reduce((sum, r) => sum + parseMoneyToNumber(r['TOTAL PAYMENT']), 0);

    updateAppData(prev => {
      const newRow = {
        "STT": prev.CustomReport.data.length + 1,
        "Trung Tâm": l07 || "",
        "Tháng": "",
        "Tổng tiền": totalPayment,
        "Ghi chú": `Tổng L07: ${l07} (Gồm ${sameL07Rows.length} AE)`
      };
      return { ...prev, CustomReport: { ...prev.CustomReport, data: [...prev.CustomReport.data, newRow] } };
    });

    setShowImportModal(false);
    toast.success(`Đã thêm tổng L07: ${l07}`);
  };

  const filteredImportList = useMemo(() => {
    const grouped: Record<string, any> = {};
    appData.Sheet1_AE.data.forEach(row => {
      const l07 = row['L07'] || "Unknown";
      if (!grouped[l07]) {
        grouped[l07] = { l07, total: 0, count: 0, business: row['Business'] || "" };
      }
      grouped[l07].total += parseMoneyToNumber(row['TOTAL PAYMENT']);
      grouped[l07].count++;
    });

    return Object.values(grouped).filter(item => {
      if (!importSearch) return true;
      const q = importSearch.toLowerCase();
      return item.l07.toLowerCase().includes(q) || item.business.toLowerCase().includes(q);
    });
  }, [appData.Sheet1_AE.data, importSearch]);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col h-full overflow-hidden bg-secondary/5 p-1 gap-1"
    >
      {/* Main Content Card */}
      <div className="bg-card/65 backdrop-blur-2xl rounded-lg shadow-hard-xl flex-1 flex flex-col overflow-hidden border-2 border-primary/20">
        {/* Integrated Header & Controls */}
        <div className="px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-primary/20 bg-white/65 backdrop-blur-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border-2 border-primary/20 shadow-hard-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground tracking-tight uppercase leading-tight">Dữ liệu Master AE</h2>
              <p className="text-[0.5625rem] font-bold text-foreground/40 uppercase tracking-widest">Quản lý & Đối chiếu danh sách nhân sự</p>
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
                    className="brutal-input pl-10 pr-4 py-2 text-xs w-64 uppercase font-bold transition-all focus:w-80 bg-white/70 backdrop-blur-sm"
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
                      <button className="flex items-center gap-2.5 px-4 py-2.5 border-2 border-primary rounded-xl bg-white text-primary hover:bg-primary hover:text-white transition-all shadow-hard-sm active:shadow-none active:translate-y-[1px] group">
                        {(() => {
                          const active = tabs.find(t => t.id === activeTab);
                          const Icon = active?.icon || FileText;
                          return <><Icon className="w-4 h-4 group-hover:scale-110 transition-transform" /> <span className="text-[0.6875rem] font-bold uppercase tracking-[0.1em]">{active?.label}</span></>;
                        })()}
                        <ChevronDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Chuyển bảng dữ liệu</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-64 border-2 border-primary shadow-hard p-1.5">
                  <DropdownMenuLabel className="font-bold uppercase text-[0.625rem] tracking-widest text-foreground/60 px-3 py-2">Chọn bảng dữ liệu</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />
                  {tabs.map((tab) => (
                    <DropdownMenuItem 
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-2.5 rounded-xl transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-hard-sm' : 'hover:bg-primary/5'}`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-0.5 h-8 bg-primary/10 mx-1.5 rounded-full" />

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
                  <DropdownMenuLabel className="font-black uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">Thao tác bảng</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />
                  
                  <DropdownMenuItem 
                    onClick={() => setShowSearch(!showSearch)}
                    className={`cursor-pointer font-black uppercase text-[0.6875rem] gap-3 p-2.5 rounded-xl transition-all ${showSearch ? 'bg-primary text-white shadow-hard-sm' : 'hover:bg-primary/5'}`}
                  >
                    <Search className="w-4 h-4" />
                    <span>{showSearch ? 'Ẩn tìm kiếm' : 'Hiện tìm kiếm'}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={processAEData}
                    disabled={isProcessing}
                    className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 focus:bg-primary/5 p-2.5 rounded-xl transition-all"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>Xử Lý Dữ Liệu AE</span>
                  </DropdownMenuItem>

                  {activeTab === 'Sheet1_AE' && (
                    <DropdownMenuItem 
                      onClick={reMapAECodes}
                      className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 focus:bg-primary/5 p-2.5 rounded-xl transition-all"
                    >
                      <Import className="w-4 h-4" />
                      <span>Re-map AE Codes</span>
                    </DropdownMenuItem>
                  )}

                  {activeTab === 'CustomReport' && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => setShowImportModal(true)}
                        className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 focus:bg-primary/5 p-2.5 rounded-xl transition-all"
                      >
                        <Import className="w-4 h-4" />
                        <span>Lấy từ Master AE</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={addCustomRow}
                        className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 focus:bg-primary/5 p-2.5 rounded-xl transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Thêm Dòng Mới</span>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuItem 
                    onClick={handleExportExcel}
                    className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 focus:bg-primary/5 p-2.5 rounded-xl transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Excel</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />
                  
                  <DropdownMenuLabel className="text-[0.625rem] font-black uppercase tracking-widest text-primary/60 px-3 py-2">Hiển thị cột</DropdownMenuLabel>
                  <div className="max-h-[200px] overflow-auto custom-scrollbar py-1 px-1">
                    {columns.map((col: any) => (
                      <DropdownMenuItem
                        key={col.key}
                        onSelect={(e) => { 
                          e.preventDefault(); 
                          tableRef.current?.toggleColumn(col.key); 
                          setUpdateTrigger(prev => prev + 1);
                        }}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors group"
                      >
                        <div className={`w-3.5 h-3.5 rounded border-2 transition-all flex items-center justify-center
                          ${!tableRef.current?.hiddenColumns?.has(col.key) ? 'bg-primary border-primary' : 'border-primary/20 group-hover:border-primary/40'}`}>
                          {!tableRef.current?.hiddenColumns?.has(col.key) && <CheckSquare className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`text-[0.625rem] font-black uppercase tracking-wider ${!tableRef.current?.hiddenColumns?.has(col.key) ? 'text-primary' : 'text-primary/30'}`}>{col.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>

                  <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />
                  
                  <DropdownMenuItem 
                    onClick={() => setShowClearDialog(true)}
                    className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 focus:bg-rose-50 text-rose-500 p-2.5 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa dữ liệu {tabs.find(t => t.id === activeTab)?.label}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-1 overflow-hidden flex flex-col">
          <div className="border-2 border-primary rounded-lg overflow-hidden shadow-hard-lg bg-white/65 backdrop-blur-2xl flex-1 flex flex-col">
            {currentData.data.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-primary/20">
                <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center border-2 border-dashed border-primary/10 mb-6">
                  <Users className="w-12 h-12 text-primary/10" />
                </div>
                <p className="text-center max-w-sm font-black uppercase text-lg tracking-tight text-foreground">Chưa có dữ liệu {tabs.find(t => t.id === activeTab)?.label}</p>
                <p className="text-[0.625rem] font-bold uppercase opacity-60 tracking-widest mt-2">Vui lòng cấu hình file AE và nhấn "Xử Lý Dữ Liệu AE".</p>
                <Button 
                  onClick={processAEData} 
                  disabled={isProcessing}
                  className="mt-6 border-2 border-primary bg-primary text-white font-black uppercase text-xs shadow-hard-sm hover:translate-y-[-2px] active:translate-y-[1px]"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Xử Lý Ngay
                </Button>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <DataTable 
                  ref={tableRef}
                  columns={columns}
                  data={currentData.data}
                  onCellChange={handleCellChange}
                  onDeleteRow={handleDeleteRow}
                  isEditable={true}
                  externalSearchTerm={searchTerm}
                  onExternalSearchChange={setSearchTerm}
                  storageKey={`master_ae_${activeTab}`}
                  hideSearch={true}
                  hideToolbar={true}
                  showFooter={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={() => {
          updateAppData(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], data: [] } }));
          toast.success(`Đã xóa dữ liệu tab ${tabs.find(t => t.id === activeTab)?.label}`);
          setShowClearDialog(false);
        }}
        title="Xác nhận xoá dữ liệu"
        description={`Bạn có chắc chắn muốn xóa toàn bộ dữ liệu trong tab ${tabs.find(t => t.id === activeTab)?.label}? Hành động này không thể hoàn tác.`}
        confirmText="Xác nhận xoá"
        variant="destructive"
      />

      {/* Import Modal for CustomReport */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-2xl border-2 border-primary shadow-hard">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-primary flex items-center gap-2">
              <Import className="w-5 h-5" /> Chọn AE từ Master Data
            </DialogTitle>
            <DialogDescription className="font-bold text-primary/60">
              Click vào dòng để thêm tổng tiền theo Trung tâm vào Báo Cáo Tùy Chỉnh
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-primary/40" />
              <input
                type="text"
                placeholder="Tìm theo Tên, ID, Center..."
                value={importSearch}
                onChange={(e) => setImportSearch(e.target.value)}
                className="brutal-input w-full pl-10"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {filteredImportList.length === 0 ? (
                <div className="text-center py-8 text-primary/40 font-bold uppercase text-xs">Không tìm thấy kết quả</div>
              ) : (
                filteredImportList.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => importL07ToCustomRow(item.l07)}
                    className="p-3 bg-white border-2 border-primary/10 rounded-xl hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group flex items-center justify-between"
                  >
                    <div>
                      <div className="font-black text-primary text-sm uppercase">Trung tâm: {item.l07}</div>
                      <div className="text-[0.625rem] font-bold text-primary/60 flex gap-3 mt-1">
                        <span className="bg-secondary/10 px-2 py-0.5 rounded border border-primary/5">SỐ LƯỢNG AE: {item.count}</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">TỔNG: {item.total.toLocaleString('vi-VN')} VND</span>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)} className="border-2 border-primary font-black uppercase text-xs">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
