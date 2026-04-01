import { useState, useRef, useEffect } from 'react';
import { Plus, UploadCloud, Layers, Trash2, FileSpreadsheet, Loader2, RefreshCw, Check, AlertTriangle, ChevronLeft, ChevronRight, Settings, Search, Link2, List, FileCheck, CheckCircle2, Circle, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { useAppData } from '../lib/AppDataContext';
import { DEFAULT_CENTERS } from '../constants';
import { getL07FromFileName, getCenterInfoByL07 } from '../lib/center-utils';
import { parseMoneyToNumber } from '../lib/data-utils';
import { ContextMenu } from '../components/ContextMenu';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

interface CenterRow {
  id: string;
  l07: string;
  aeCode: string;
  bus: string;
  url: string;
  status: string;
  timePeriod: string; // Thêm trường timePeriod
  fileObj?: File | null;
  cachedData?: any[];
  lastProcessedUrl?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function CenterDataConfig() {
  const { appData, updateAppData } = useAppData();

  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const filteredData = appData.Fr_InputList.filter(row => 
    !searchTerm || 
    row.l07?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.aeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.bus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.url?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const clearPageData = () => {
    updateAppData(prev => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.map(row => ({
        ...row,
        url: '',
        fileObj: undefined,
        status: 'ready',
        cachedData: undefined
      }))
    }));
    setShowClearDialog(false);
    toast.success("Đã xóa toàn bộ file và trạng thái.");
  };
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContextMenu = (e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowId });
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return;
    if (action === 'deleteRow') deleteRow(contextMenu.rowId);
    setContextMenu(null);
  };

  const addRow = () => {
    const newRow: CenterRow = {
      id: Date.now().toString(),
      l07: '',
      aeCode: '',
      bus: '',
      url: '',
      status: 'ready',
      timePeriod: new Date().toISOString().slice(0, 7), // Mặc định là tháng hiện tại
    };
    updateAppData(prev => ({
      ...prev,
      Fr_InputList: [...prev.Fr_InputList, newRow]
    }));
  };

  const deleteRow = (id: string) => {
    updateAppData(prev => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.filter(row => row.id !== id)
    }));
  };

  const updateRow = (id: string, field: keyof CenterRow, value: any) => {
    updateAppData(prev => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.map(row => row.id === id ? { ...row, [field]: value } : row)
    }));
  };

  const handleFileUpload = (id: string, file: File) => {
    updateAppData(prev => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.map(row => 
        row.id === id 
          ? { ...row, fileObj: file, url: file.name, status: 'Uploaded', l07: row.l07 || getL07FromFileName(file.name) }
          : row
      )
    }));
  };

  const [unmatchedFiles, setUnmatchedFiles] = useState<File[]>([]);
  const [showUnmatchedDialog, setShowUnmatchedDialog] = useState(false);
  const [currentUnmatchedFile, setCurrentUnmatchedFile] = useState<File | null>(null);
  const [manualL07, setManualL07] = useState('');

  const handleMultiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const unmatched: File[] = [];
    const allowedExtensions = ['.xlsx', '.xls', '.gsheet'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    updateAppData(prev => {
      const newList = [...prev.Fr_InputList];
      
      Array.from(files).forEach(file => {
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
          toast.error(`Định dạng file không hợp lệ: ${file.name}. Vui lòng tải lên file Excel (.xlsx, .xls).`);
          return;
        }
        if (file.size > maxSize) {
          toast.error(`File quá lớn: ${file.name}. Vui lòng tải lên file nhỏ hơn 10MB.`);
          return;
        }

        const l07 = getL07FromFileName(file.name);
        if (l07) {
          // Find existing row with this l07
          const existingIdx = newList.findIndex(row => row.l07 === l07);
          
          // Look up aeCode and bus from DEFAULT_CENTERS
          const centerInfo = getCenterInfoByL07(l07);
          const aeCode = centerInfo?.aeCode || '';
          const bus = centerInfo?.bus || '';

          if (existingIdx !== -1) {
            // Update existing row
            newList[existingIdx] = {
              ...newList[existingIdx],
              url: file.name,
              status: 'Uploaded',
              fileObj: file,
              aeCode: newList[existingIdx].aeCode || aeCode,
              bus: newList[existingIdx].bus || bus
            };
          } else {
            // Add new row
            newList.push({
              id: Date.now().toString() + Math.random(),
              l07: l07,
              aeCode: aeCode,
              bus: bus,
              url: file.name,
              status: 'Uploaded',
              fileObj: file
            });
          }
        } else {
          unmatched.push(file);
        }
      });

      return { ...prev, Fr_InputList: newList };
    });

    if (unmatched.length > 0) {
      setUnmatchedFiles(unmatched);
      setCurrentUnmatchedFile(unmatched[0]);
      setManualL07('');
      setShowUnmatchedDialog(true);
    }

    e.target.value = '';
  };

  const handleManualL07Submit = () => {
    if (!currentUnmatchedFile || !manualL07.trim()) {
      toast.error("Vui lòng nhập mã L07");
      return;
    }

    const l07 = manualL07.trim().toUpperCase();
    const centerInfo = getCenterInfoByL07(l07);
    const aeCode = centerInfo?.aeCode || '';
    const bus = centerInfo?.bus || '';

    updateAppData(prev => {
      const newList = [...prev.Fr_InputList];
      const existingIdx = newList.findIndex(row => row.l07 === l07);
      
      if (existingIdx !== -1) {
        newList[existingIdx] = {
          ...newList[existingIdx],
          url: currentUnmatchedFile.name,
          status: 'Uploaded',
          fileObj: currentUnmatchedFile,
          aeCode: newList[existingIdx].aeCode || aeCode,
          bus: newList[existingIdx].bus || bus
        };
      } else {
        newList.push({
          id: Date.now().toString() + Math.random(),
          l07: l07,
          aeCode: aeCode,
          bus: bus,
          url: currentUnmatchedFile.name,
          status: 'Uploaded',
          fileObj: currentUnmatchedFile
        });
      }
      return { ...prev, Fr_InputList: newList };
    });

    const remaining = unmatchedFiles.slice(1);
    if (remaining.length > 0) {
      setUnmatchedFiles(remaining);
      setCurrentUnmatchedFile(remaining[0]);
      setManualL07('');
    } else {
      setUnmatchedFiles([]);
      setCurrentUnmatchedFile(null);
      setShowUnmatchedDialog(false);
      setManualL07('');
    }
  };

  const handleSkipUnmatched = () => {
    const remaining = unmatchedFiles.slice(1);
    if (remaining.length > 0) {
      setUnmatchedFiles(remaining);
      setCurrentUnmatchedFile(remaining[0]);
      setManualL07('');
    } else {
      setUnmatchedFiles([]);
      setCurrentUnmatchedFile(null);
      setShowUnmatchedDialog(false);
      setManualL07('');
    }
  };

  const processFrCenters = async (onlyNew = false) => {
    const currentList = [...appData.Fr_InputList];
    const targets = onlyNew 
      ? currentList.filter(item => item.status !== 'Success' && (item.fileObj || item.url))
      : currentList.filter(item => item.fileObj || item.url);

    if (targets.length === 0) {
      toast.error("Không có dữ liệu mới để tổng hợp!");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingMessage("Bắt đầu tổng hợp dữ liệu Centers...");
    await new Promise(resolve => setTimeout(resolve, 10));

    let successCount = 0;
    let failCount = 0;
    const finalHeaders = [
      "No", "L07", "Business", "ID Number", "Full name", "Salary Scale", "From", "To",
      "Bank Account Number", "Bank Name", "CITAD code", "TAX CODE",
      "Contract No", "CHARGE TO LXO", "CHARGE TO EC", "CHARGE TO PT-DEMO",
      "Charge MKT Local", "Charge Renewal Projects", "Charge Discovery Camp",
      "Charge Summer Outing", "TOTAL PAYMENT"
    ];

    try {
      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        setProgress(Math.round(((i + 1) / targets.length) * 100));
        setProcessingMessage(`Đang xử lý ${i + 1}/${targets.length}: ${item.l07 || item.url}...`);
        await new Promise(resolve => setTimeout(resolve, 10));

        try {
          let wb: XLSX.WorkBook;
          if (item.fileObj) {
            const buf = await item.fileObj.arrayBuffer();
            wb = XLSX.read(buf, { cellDates: true });
          } else if (item.url && item.url.startsWith("http")) {
            throw new Error("Tính năng fetch Google Sheet trực tiếp đang được phát triển. Vui lòng tải file Excel.");
          } else {
            throw new Error("Không có file hoặc URL hợp lệ.");
          }

          // Xử lý từng sheet trong file
          wb.SheetNames.forEach(sheetName => {
            const ws = wb.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
            if (rows.length === 0) return;

            // Chuyển array of arrays thành array of objects
            const headers = rows[0] as string[];
            const dataObjects = rows.slice(1).map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index];
              });
              // Thêm thông tin file gốc
              obj._sourceFile = item.fileObj?.name || item.url || "Unknown";
              return obj;
            });

            // Phân loại dữ liệu dựa trên tên sheet chính xác
            if (sheetName === "Q_Staff") {
              updateAppData(prev => ({ ...prev, Q_Staff: [...(prev.Q_Staff || []), ...dataObjects] }));
            } else if (sheetName === "Q_Salary_Scale") {
              updateAppData(prev => ({ ...prev, Q_Salary_Scale: [...(prev.Q_Salary_Scale || []), ...dataObjects] }));
            } else if (sheetName === "Q_Roster") {
              updateAppData(prev => ({ ...prev, Q_Roster: [...(prev.Q_Roster || []), ...dataObjects] }));
            } else if (sheetName === "Timesheet") {
              updateAppData(prev => ({ ...prev, Timesheets: [...(prev.Timesheets || []), ...dataObjects] }));
            }
          });

          // Xử lý dữ liệu Center (Logic cũ cho sheet COST hoặc sheet đầu tiên)
          const costSheetName = wb.SheetNames.find(name => name.toUpperCase().includes("COST"));
          const ws = wb.Sheets[costSheetName || wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });

          if (rows.length > 0) {
            // 2. Tìm dòng Header trong 15 dòng đầu
            let headerRowIdx = -1;
            let h: string[] = [];

            for (let i = 0; i < Math.min(15, rows.length); i++) {
              const row = rows[i].map(x => String(x).trim().toUpperCase());
              const hasId = row.some(x => ["ID NUMBER", "ID", "MÃ NV", "MÃ NHÂN VIÊN", "EMPLOYEE ID", "FULL NAME", "HỌ VÀ TÊN", "TÊN", "NAME"].some(a => x.includes(a)));
              const hasTotal = row.some(x => ["TOTAL PAYMENT", "THỰC NHẬN", "TỔNG", "AMOUNT", "NET PAY"].some(a => x.includes(a)));
              
              if (hasId && hasTotal) {
                headerRowIdx = i;
                h = row;
                break;
              }
            }

            if (headerRowIdx === -1) {
              throw new Error("Không tìm thấy dòng tiêu đề chứa thông tin ID/Tên và Total Payment trong 15 dòng đầu.");
            }

            // 3. Logic tìm cột thông minh (fallback)
            const findCol = (aliases: string[]) => h.findIndex(x => aliases.some(a => x.includes(a.toUpperCase())));

            const iId = findCol(["ID NUMBER", "ID", "MÃ NV", "MÃ NHÂN VIÊN", "EMPLOYEE ID"]);
            const iN = findCol(["FULL NAME", "HỌ VÀ TÊN", "TÊN", "NAME"]);
            const iT = findCol(["TOTAL PAYMENT", "THỰC NHẬN", "TỔNG", "AMOUNT", "NET PAY"]);
            
            // 4. Điều kiện nới lỏng: Cần ID (hoặc Tên) VÀ Total Payment
            if ((iId === -1 && iN === -1) || iT === -1) {
              throw new Error(`File không hợp lệ. Cần ít nhất cột ID hoặc Tên VÀ cột Total Payment. Tìm thấy: ID=${iId}, Name=${iN}, Total=${iT}.`);
            }

            const dataRows: any[] = [];
            for (let r = headerRowIdx + 1; r < rows.length; r++) {
              const rData = rows[r];
              if (!rData[iId] && !rData[iN]) continue;
              
              let obj: any = {};
              // Mapping thông minh
              finalHeaders.forEach((th) => {
                const colIdx = h.findIndex(x => {
                    const normalizedTh = th.toUpperCase();
                    // Fallback mapping
                    if (normalizedTh === "ID NUMBER") return x === "ID NUMBER" || x === "ID" || x === "MÃ NV" || x === "MÃ NHÂN VIÊN" || x === "EMPLOYEE ID";
                    if (normalizedTh === "FULL NAME") return x === "FULL NAME" || x === "HỌ VÀ TÊN" || x === "TÊN" || x === "NAME";
                    if (normalizedTh === "TOTAL PAYMENT") return x === "TOTAL PAYMENT" || x === "THỰC NHẬN" || x === "TỔNG" || x === "AMOUNT" || x === "NET PAY";
                    if (normalizedTh === "BANK ACCOUNT NUMBER") return x === "BANK ACCOUNT NUMBER" || x === "STK" || x === "TÀI KHOẢN";
                    return x === normalizedTh;
                });
                if (colIdx !== -1) obj[th] = rData[colIdx];
                else obj[th] = "";
              });
              
              obj["L07"] = item.l07;
              obj["Business"] = item.bus;
              obj["TOTAL PAYMENT"] = parseMoneyToNumber(rData[iT]);
              dataRows.push(obj);
            }
            item.cachedData = dataRows;
            item.status = 'Success';
            successCount++;
          } else {
            item.status = 'Error: No data';
            failCount++;
          }
        } catch (e: any) {
          item.status = `Error: ${e.message}`;
          failCount++;
        }

        updateAppData(prev => ({
          ...prev,
          Fr_InputList: prev.Fr_InputList.map(row => 
            row.id === item.id ? { ...item } : row
          )
        }), false);
      }

      let allData: any[] = [];
      let seenKeys = new Set();
      let aeMapForMod2: Record<string, { name: string; bus: string }> = {};

      currentList.forEach((item, centerIdx) => {
        // Update AE Map regardless (if we have data)
        if (item.aeCode) {
          const code = String(item.aeCode).trim().toLowerCase();
          if (code) {
            aeMapForMod2[code] = { name: item.l07, bus: item.bus };
          }
        }
        // Also map by L07 for better matching
        if (item.l07) {
          const l07Key = String(item.l07).trim().toLowerCase();
          if (l07Key && !aeMapForMod2[l07Key]) {
            aeMapForMod2[l07Key] = { name: item.l07, bus: item.bus };
          }
        }

        if (item.cachedData && item.cachedData.length > 0) {
          item.cachedData.forEach((row: any, rowIdx: number) => {
            const idNum = String(row["ID Number"] || "").trim();
            const l07 = String(row["L07"] || "").trim();
            const total = parseMoneyToNumber(row["TOTAL PAYMENT"]);
            const key = `${idNum}|${l07}|${total}`;
            
            row._centerIdx = centerIdx;
            row._rowIdx = rowIdx;

            if (!seenKeys.has(key)) {
              allData.push(row);
              seenKeys.add(key);
            }
          });
        }
      });

      updateAppData(prev => ({
        ...prev,
        Fr_InputList: currentList,
        Final_Centers: { headers: finalHeaders, data: allData },
        AE_Map: aeMapForMod2
      }));

      toast.success(`Tổng hợp xong! Thành công: ${successCount}, Lỗi/Trống: ${failCount}. Tổng ${allData.length} dòng.`);
    } catch (error: any) {
      console.error("Critical Error in processFrCenters:", error);
      toast.error("Lỗi hệ thống khi xử lý: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3 w-full h-full p-4 bg-transparent"
    >
      <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
            <List className="w-4 h-4 text-indigo-600" /> 1. FILE DỮ LIỆU CENTERS
          </h4>
          <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-white text-black border-2 border-black text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-gray-100 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
                    <Settings className="w-4 h-4" />
                    Cài đặt
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-2 border-black shadow-[4px_4px_0px_#000] p-1">
                  <DropdownMenuLabel className="text-[0.625rem] font-black uppercase tracking-widest text-black/60 px-2 py-1.5">Thao tác</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span className="text-[0.625rem] font-black uppercase tracking-wider">Tải lên nhiều file</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.success("Đã lưu danh sách!")} className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                    <Save className="w-3.5 h-3.5" />
                    <span className="text-[0.625rem] font-black uppercase tracking-wider">Lưu danh sách</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => processFrCenters(false)} disabled={isProcessing} className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                    <span className="text-[0.625rem] font-black uppercase tracking-wider">Tổng hợp dữ liệu</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-black/10 mx-1" />
                </DropdownMenuContent>
              </DropdownMenu>
              <input type="file" id="multi-center-upload" multiple className="hidden" accept=".xlsx, .xls, .gsheet" onChange={handleMultiUpload} ref={fileInputRef} />
              <span className="bg-white border border-black text-black text-xs font-bold px-2 py-1 rounded-lg">{appData.Fr_InputList.length} Centers</span>
          </div>
      </div>
      <div className="bg-white/65 backdrop-blur-2xl border-2 border-slate-900/10 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#000] flex-1 flex flex-col min-h-0">
          <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="text-left">
                  <thead className="bg-secondary/60 backdrop-blur-lg sticky top-0 z-20">
                      <tr>
                          <th style={{ width: '60px' }}>STT</th>
                          <th style={{ width: '180px' }}>L07</th>
                          <th style={{ width: '150px' }}>Mã AE</th>
                          <th style={{ width: '120px' }}>Business</th>
                          <th style={{ width: '400px' }}>File / Link Dữ Liệu</th>
                          <th style={{ width: '140px' }}>Trạng thái</th>
                          <th style={{ width: '90px' }}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {appData.Fr_InputList.map((item, index) => (
                          <tr key={item.id}>
                              <td className="text-center">{index + 1}</td>
                              <td>
                                  <input 
                                    type="text" 
                                    value={item.l07} 
                                    onChange={(e) => updateRow(item.id, 'l07', e.target.value)} 
                                    className="w-full font-medium text-foreground text-sm whitespace-nowrap outline-none focus:bg-primary/10 px-1 py-1 rounded transition-colors bg-transparent border-none focus:ring-0" 
                                    placeholder="L07"
                                  />
                              </td>
                              <td>
                                  <input 
                                    type="text" 
                                    value={item.aeCode} 
                                    onChange={(e) => updateRow(item.id, 'aeCode', e.target.value)} 
                                    className="w-full font-medium text-foreground text-sm whitespace-nowrap outline-none focus:bg-primary/10 px-1 py-1 rounded transition-colors bg-transparent border-none focus:ring-0" 
                                    placeholder="Mã AE"
                                  />
                              </td>
                              <td>
                                  <input 
                                    type="text" 
                                    value={item.bus} 
                                    onChange={(e) => updateRow(item.id, 'bus', e.target.value)} 
                                    className="w-full font-medium text-foreground text-sm whitespace-nowrap outline-none focus:bg-primary/10 px-1 py-1 rounded transition-colors bg-transparent border-none focus:ring-0" 
                                    placeholder="Business"
                                  />
                              </td>
                              <td>
                                  <div className="flex items-center gap-3">
                                      <label className="cursor-pointer bg-white border-2 border-black hover:bg-gray-100 text-black px-3 py-1.5 rounded-lg text-[0.625rem] font-medium transition-all shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shrink-0">
                                          <UploadCloud className="w-3 h-3" />
                                          <span>UPLOAD</span>
                                          <input type="file" className="hidden" accept=".xlsx, .xls, .gsheet" onChange={(e) => {
                                              if (e.target.files?.[0]) handleFileUpload(item.id, e.target.files[0]);
                                          }} />
                                      </label>
                                      <div className="flex-1 relative">
                                          <input type="text" placeholder="Dán Link Google Sheet..." 
                                              className="w-full border-2 border-black rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium focus:outline-none focus:bg-indigo-50 transition-all placeholder:text-gray-400 bg-white"
                                              value={item.url} onChange={(e) => updateRow(item.id, 'url', e.target.value)} />
                                          <Link2 className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                      </div>
                                  </div>
                                  {item.fileObj && (
                                      <div className="mt-2 ml-1 text-[0.625rem] text-green-600 font-medium flex items-center gap-1 bg-green-50 w-fit px-2 py-0.5 rounded border border-green-100">
                                          <FileCheck className="w-3 h-3" /> {item.fileObj.name}
                                      </div>
                                  )}
                              </td>
                              <td className="text-center">
                                  <div className="flex items-center justify-center">
                                      {(item.status === 'ready' || item.status === 'Uploaded' || item.status === 'Success' || item.fileObj) ? (
                                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border-2 border-green-200 text-green-600 text-[0.625rem] font-medium uppercase tracking-wider whitespace-nowrap">
                                              <CheckCircle2 className="w-3 h-3" /> Sẵn sàng
                                          </div>
                                      ) : (
                                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border-2 border-gray-200 text-gray-400 text-[0.625rem] font-medium uppercase tracking-wider whitespace-nowrap">
                                              <Circle className="w-3 h-3" /> Trống
                                          </div>
                                      )}
                                  </div>
                              </td>
                              <td className="text-center">
                                  <button onClick={() => deleteRow(item.id)} 
                                      className="w-8 h-8 rounded-lg border-2 border-black bg-white hover:bg-rose-50 text-rose-600 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center mx-auto">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
      
      {isProcessing && (
        <div className="mt-2 p-4 border-2 border-slate-900/10 bg-white/65 backdrop-blur-2xl flex flex-col gap-3 text-black rounded-xl shadow-[4px_4px_0px_#000]">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-black uppercase text-[0.6875rem] tracking-widest">{processingMessage}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden border border-black">
            <div className="bg-black h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      <div className="flex justify-end mt-2 gap-1.5 shrink-0 hidden">
        <div className="flex items-center gap-1.5 bg-white/65 p-1.5 rounded-2xl border-2 border-primary/10 shadow-inner">
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => toast.success("Đã lưu danh sách!")}
                className="p-2.5 border-2 border-black rounded-xl bg-white text-black hover:bg-gray-100 transition-all shadow-hard-sm active:translate-y-[1px]"
              >
                <Save className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Lưu danh sách</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => processFrCenters(false)}
                disabled={isProcessing}
                className={`p-2.5 border-2 border-black rounded-xl transition-all shadow-hard-sm active:translate-y-[1px] flex items-center justify-center ${isProcessing ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-black text-white hover:bg-gray-800'}`}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>Tổng hợp dữ liệu</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="border-2 border-primary shadow-hard">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-primary">Xác nhận xoá file và trạng thái</DialogTitle>
            <DialogDescription className="font-bold text-primary/60">
              Bạn có chắc chắn muốn xóa toàn bộ file đã tải lên và đặt lại trạng thái? Các cấu hình L07 (Mã), Mã AE và Business sẽ được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} className="border-2 border-primary font-black uppercase text-xs">Hủy</Button>
            <Button variant="destructive" onClick={clearPageData} className="border-2 border-rose-600 bg-rose-500 font-black uppercase text-xs hover:bg-rose-600">Xác nhận xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unmatched File Dialog */}
      <Dialog open={showUnmatchedDialog} onOpenChange={setShowUnmatchedDialog}>
        <DialogContent className="sm:max-w-[425px] border-2 border-primary shadow-hard">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-primary flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              File không xác định
            </DialogTitle>
            <DialogDescription className="font-bold text-primary/60">
              Không thể tự động nhận diện Mã AE cho file này. Vui lòng nhập Mã AE thủ công hoặc bỏ qua.
            </DialogDescription>
          </DialogHeader>
          
          {currentUnmatchedFile && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-secondary/10 rounded-xl border border-primary/10">
                <p className="text-xs font-bold text-primary/60 uppercase mb-1">Tên file:</p>
                <p className="text-sm font-black text-primary truncate" title={currentUnmatchedFile.name}>
                  {currentUnmatchedFile.name}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase">Nhập Mã AE cho file này:</label>
                <input
                  type="text"
                  value={manualL07}
                  onChange={(e) => setManualL07(e.target.value)}
                  placeholder="VD: HN0001.PHY"
                  className="brutal-input w-full uppercase"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualL07Submit();
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="text-xs font-bold text-primary/40 flex items-center">
              Còn lại: {unmatchedFiles.length} file
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkipUnmatched} className="border-2 border-primary font-black uppercase text-xs">
                Bỏ qua
              </Button>
              <Button onClick={handleManualL07Submit} className="border-2 border-primary bg-primary font-black uppercase text-xs shadow-hard-sm hover:translate-y-[-2px] active:translate-y-[1px]">
                Xác nhận
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
