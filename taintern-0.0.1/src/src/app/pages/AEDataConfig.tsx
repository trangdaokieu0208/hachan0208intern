import { useState, useRef, useEffect } from 'react';
import { Plus, UploadCloud, Layers, Trash2, FileSpreadsheet, Loader2, AlertTriangle, Check, RefreshCw, ChevronLeft, ChevronRight, Settings, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { useAppData } from '../lib/AppDataContext';
import { parseMoneyToNumber, cleanText } from '../lib/data-utils';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/src/app/components/ui/dialog';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

interface AERow {
  id: string;
  name: string;
  fileObj?: File | null;
  status: string;
  bank?: string;
  month?: string;
}

interface PendingUpload {
  file: File;
  existingRowId?: string;
}

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

export function AEDataConfig() {
  const { appData, updateAppData } = useAppData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [choices, setChoices] = useState<{ file: File, action: 'update' | 'new' | 'skip', targetId?: string }[]>([]);
  const [showDialog, setShowDialog] = useState(false);

  // Initialize choices when pendingUploads changes
  useEffect(() => {
    setChoices(pendingUploads.map(p => ({ file: p.file, action: p.existingRowId ? 'update' : 'new', targetId: p.existingRowId })));
  }, [pendingUploads]);

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const filteredData = appData.Ae_Global_Inputs.filter(row => 
    row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (row.bank || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (row.month || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const clearPageData = () => {
    updateAppData(prev => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map(row => ({
        ...row,
        fileObj: undefined,
        status: 'ready',
        cachedData: undefined
      }))
    }));
    setShowClearDialog(false);
    toast.success("Đã xóa toàn bộ file và trạng thái.");
  };

  const addRow = () => {
    const newRow: AERow = {
      id: Date.now().toString(),
      name: '',
      status: 'ready',
      bank: '',
      month: '',
    };
    updateAppData(prev => ({
      ...prev,
      Ae_Global_Inputs: [...prev.Ae_Global_Inputs, newRow]
    }));
  };

  const deleteRow = (id: string | undefined) => {
    if (!id) return;
    updateAppData(prev => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.filter(row => row.id !== id)
    }));
  };

  const updateRow = (id: string, field: keyof AERow, value: any) => {
    updateAppData(prev => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map(row => row.id === id ? { ...row, [field]: value } : row)
    }));
  };

  const handleFileUpload = (id: string, file: File) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error(`Định dạng file không hợp lệ: ${file.name}. Vui lòng tải lên file Excel (.xlsx, .xls).`);
      return;
    }

    if (file.size > maxSize) {
      toast.error(`File quá lớn: ${file.name}. Vui lòng tải lên file nhỏ hơn 10MB.`);
      return;
    }

    updateAppData(prev => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map(row => 
        row.id === id 
          ? { ...row, fileObj: file, name: file.name, status: 'Uploaded' }
          : row
      )
    }));
    toast.success(`Đã tải lên file: ${file.name}`);
  };

  const handleMultiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPending: PendingUpload[] = [];
    Array.from(files).forEach(file => {
      const existingRow = appData.Ae_Global_Inputs.find(row => row.name === file.name);
      if (existingRow) {
        newPending.push({ file, existingRowId: existingRow.id });
      } else {
        newPending.push({ file });
      }
    });

    setPendingUploads(newPending);
    setShowDialog(true);
    e.target.value = ''; // Reset input
  };

  const confirmUploads = (choices: { file: File, action: 'update' | 'new' | 'skip', targetId?: string }[]) => {
    const newRows: AERow[] = [];
    const updates: { id: string, file: File }[] = [];

    choices.forEach(choice => {
      if (choice.action === 'update' && choice.targetId) {
        updates.push({ id: choice.targetId, file: choice.file });
      } else if (choice.action === 'new') {
        newRows.push({
          id: Date.now().toString() + Math.random(),
          name: choice.file.name,
          status: 'Uploaded',
          fileObj: choice.file,
          bank: '',
          month: '',
        });
      }
    });

    updateAppData(prev => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map(row => {
        const update = updates.find(u => u.id === row.id);
        return update ? { ...row, fileObj: update.file, status: 'Uploaded' } : row;
      }).concat(newRows)
    }));
    setShowDialog(false);
    setPendingUploads([]);
    toast.success(`Đã tải lên ${newRows.length + updates.length} file`);
  };

  const processAEData = async () => {
    const targets = appData.Ae_Global_Inputs.filter(item => item.fileObj);
    if (targets.length === 0) {
      toast.error("Vui lòng chọn ít nhất một File AE Final!");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingMessage("Đang chuẩn bị xử lý dữ liệu AE...");
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const totalFiles = targets.length;
    let processedFiles = 0;

    try {
      let bankData: any[] = [];
      let sheet1Data: any[] = [];
      let holdData: any[] = [];
      let soSanhAeData: any[] = [];
      
      const sheet1Headers = [
        "No", "L07", "Business", "ID Number", "Full name", "Salary Scale", "From", "To",
        "Bank Account Number", "Bank Name", "CITAD code", "TAX CODE",
        "Contract No", "CHARGE TO LXO", "CHARGE TO EC", "CHARGE TO PT-DEMO",
        "Charge MKT Local", "Charge Renewal Projects", "Charge Discovery Camp",
        "Charge Summer Outing", "TOTAL PAYMENT"
      ];

      let foundAnySheet = false;
      const aeMap = appData.AE_Map;

      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        if (!item.fileObj) continue;

        processedFiles++;
        setProgress(Math.round((processedFiles / totalFiles) * 100));
        setProcessingMessage(`Đang xử lý file ${i + 1}/${targets.length}: ${item.name}...`);
        await new Promise(resolve => setTimeout(resolve, 10));

        updateAppData(prev => ({
          ...prev,
          Ae_Global_Inputs: prev.Ae_Global_Inputs.map(row => 
            row.id === item.id ? { ...row, status: 'Processing...' } : row
          )
        }), false);

        try {
          const buf = await item.fileObj.arrayBuffer();
          await new Promise(resolve => setTimeout(resolve, 0));
          const wb = XLSX.read(buf, { cellDates: true });
          let fileProcessedSuccessfully = false;

          if (wb.SheetNames.length === 0) {
            throw new Error("File không có sheet nào.");
          }

          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
            if (rows.length <= 1) continue;

            const nameUpper = sheetName.toUpperCase();
            let sheetProcessed = false;

            if (nameUpper.includes("BANK") || nameUpper.includes("NGÂN HÀNG")) {
              let headerRowIndex = -1;
              for (let r = 0; r < Math.min(30, rows.length); r++) {
                const rowStr = rows[r].map(c => String(c).toUpperCase()).join(" ");
                if ((rowStr.includes("FULL NAME") || rowStr.includes("HỌ VÀ TÊN") || rowStr.includes("TÊN")) && 
                    (rowStr.includes("ACCOUNT") || rowStr.includes("SỐ TÀI KHOẢN") || rowStr.includes("TÀI KHOẢN") || rowStr.includes("STK"))) {
                  headerRowIndex = r;
                  break;
                }
              }

              if (headerRowIndex !== -1) {
                foundAnySheet = true;
                sheetProcessed = true;
                const h = rows[headerRowIndex];
                
                const iS = h.findIndex(x => String(x).toUpperCase().includes("NO"));
                const iId = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("ID NUMBER") || v === "ID" || v.includes("CMND") || v.includes("MÃ NV"); });
                const iN = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("NAME") || v.includes("TÊN"); });
                const iA = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("ACCOUNT") || v.includes("TÀI KHOẢN") || v.includes("STK"); });
                const iT = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("TOTAL") || v.includes("TỔNG") || v.includes("THỰC NHẬN"); });
                const iP = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("PAYMENT DETAILS") || v.includes("NỘI DUNG") || v.includes("DIỄN GIẢI") || v.includes("DESCRIPTION"); });
                const iBank = h.findIndex(x => { const v = String(x).toUpperCase().trim(); return v === "BANK" || v === "NGÂN HÀNG" || v === "TEN NGAN HANG" || v === "TÊN NGÂN HÀNG"; });
                const iThang = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("THÁNG") || v.includes("MONTH") || v.includes("KỲ"); });
                const iCenter = h.findIndex(x => { const v = String(x).toUpperCase(); return v === "CENTER" || v.includes("COST CENTER") || v.includes("TRUNG TÂM") || v.includes("AE CODE") || v === "AE" || v.includes("MÃ AE"); });

                for (let r = headerRowIndex + 1; r < rows.length; r++) {
                  const row = rows[r];
                  if (row.every(cell => cell === "")) continue;

                  const rawTP = iT !== -1 && row[iT] !== undefined ? row[iT] : "";
                  const t = parseMoneyToNumber(rawTP);
                  const nameVal = iN !== -1 && row[iN] !== undefined ? String(row[iN]).trim() : "";
                  const acc = iA !== -1 && row[iA] !== undefined ? String(row[iA]).replace(/\s/g, '') : "";
                  const idVal = iId !== -1 && row[iId] !== undefined ? String(row[iId]).trim() : "";
                  
                  let type = "Liên ngân hàng";
                  if (!acc) type = "⚠️ Thiếu STK";
                  else if (acc.length < 6 || acc.length > 25) type = "⚠️ Sai độ dài";
                  else if (acc.startsWith("0") || acc.startsWith("10")) type = "Nội bộ VCB";

                  const rawCenterVal = iCenter !== -1 && row[iCenter] !== undefined ? String(row[iCenter]).trim() : "";
                  const rawCenterKey = rawCenterVal.toLowerCase();
                  let l07 = rawCenterVal;
                  let business = "";

                  if (aeMap[rawCenterKey]) {
                    l07 = aeMap[rawCenterKey].name;
                    business = aeMap[rawCenterKey].bus;
                  }

                  bankData.push({
                    "No": iS !== -1 && row[iS] !== undefined ? row[iS] : "", 
                    "ID Number": idVal, 
                    "Full name": nameVal,
                    "L07": l07,
                    "Business": business,
                    "Bank Account Number": acc, 
                    "Bank": (iBank !== -1 && row[iBank] !== undefined && String(row[iBank]).trim() !== "") ? String(row[iBank]).trim() : (item.bank || ""),
                    "Tháng": (iThang !== -1 && row[iThang] !== undefined && String(row[iThang]).trim() !== "") ? String(row[iThang]).trim() : (item.month || ""),
                    "TOTAL PAYMENT": t, 
                    "LOẠI CK": type,
                    "Payment details": iP !== -1 && row[iP] !== undefined ? String(row[iP]).trim() : "",
                  });
                }
              }
            }

            if (nameUpper.includes("HOLD")) {
              let headerRowIndex = -1;
              for (let r = 0; r < Math.min(30, rows.length); r++) {
                const rowStr = rows[r].map(c => String(c).toUpperCase()).join(" ");
                if ((rowStr.includes("FULL NAME") || rowStr.includes("HỌ VÀ TÊN") || rowStr.includes("TÊN")) && 
                    (rowStr.includes("ACCOUNT") || rowStr.includes("SỐ TÀI KHOẢN") || rowStr.includes("TÀI KHOẢN") || rowStr.includes("STK"))) {
                  headerRowIndex = r;
                  break;
                }
              }

              if (headerRowIndex !== -1) {
                foundAnySheet = true;
                sheetProcessed = true;
                const h = rows[headerRowIndex];
                
                const iId = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("ID NUMBER") || v === "ID" || v.includes("CMND") || v.includes("MÃ NV"); });
                const iN = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("NAME") || v.includes("TÊN"); });
                const iA = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("ACCOUNT") || v.includes("TÀI KHOẢN") || v.includes("STK"); });
                const iT = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("TOTAL") || v.includes("TỔNG") || v.includes("THỰC NHẬN"); });
                const iBank = h.findIndex(x => { const v = String(x).toUpperCase().trim(); return v === "BANK" || v === "NGÂN HÀNG" || v === "TEN NGAN HANG" || v === "TÊN NGÂN HÀNG"; });
                const iThang = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("THÁNG") || v.includes("MONTH") || v.includes("KỲ"); });
                const iTax = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("TAX") || v.includes("MST"); });
                const iContract = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("CONTRACT") || v.includes("HỢP ĐỒNG"); });
                const iCenterNote = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("CENTER NOTE") || v.includes("GHI CHÚ"); });
                const iNote = h.findIndex(x => { const v = String(x).toUpperCase(); return v === "NOTE" || v === "GHI CHÚ"; });

                for (let r = headerRowIndex + 1; r < rows.length; r++) {
                  const row = rows[r];
                  if (!row || row.length < 3) continue;

                  const idVal = iId !== -1 && row[iId] !== undefined ? String(row[iId]).trim() : "";
                  const nameVal = iN !== -1 && row[iN] !== undefined ? String(row[iN]).trim() : "";
                  const accVal = iA !== -1 && row[iA] !== undefined ? String(row[iA]).replace(/\s/g, '') : "";
                  const taxCode = iTax !== -1 && row[iTax] !== undefined ? String(row[iTax]).trim() : "";
                  const contractNo = iContract !== -1 && row[iContract] !== undefined ? String(row[iContract]).trim() : "";
                  const rawTP = iT !== -1 && row[iT] !== undefined ? row[iT] : "";
                  const numTP = parseMoneyToNumber(rawTP);
                  const centerNote = iCenterNote !== -1 && row[iCenterNote] !== undefined ? String(row[iCenterNote]).trim() : "";
                  const note = iNote !== -1 && row[iNote] !== undefined ? String(row[iNote]).trim() : "";
                  const bankVal = (iBank !== -1 && row[iBank] !== undefined && String(row[iBank]).trim() !== "") ? String(row[iBank]).trim() : (item.bank || "");
                  const thangVal = (iThang !== -1 && row[iThang] !== undefined && String(row[iThang]).trim() !== "") ? String(row[iThang]).trim() : (item.month || "");

                  if (!idVal && !nameVal && numTP === 0) continue;
                  if (!accVal) continue;

                  holdData.push({
                    "No": holdData.length + 1,
                    "ID Number": idVal,
                    "Full name": nameVal,
                    "Bank Account Number": accVal,
                    "Bank": bankVal,
                    "Tháng": thangVal,
                    "TAX CODE": taxCode,
                    "Contract No": contractNo,
                    "TOTAL PAYMENT": numTP,
                    "CENTER NOTE": centerNote,
                    "Sheet Source": sheetName,
                    "Note": note
                  });
                }
              }
            }

            if (nameUpper.includes("SHEET 1") || nameUpper.includes("SHEET1")) {
              console.log(`[DEBUG] Found Sheet 1 in file: ${item.name}`);
              let headerRowIndex = -1;
              for (let r = 0; r < Math.min(30, rows.length); r++) {
                const rowStr = rows[r].map(c => String(c).toUpperCase()).join(" ");
                let matchCount = 0;
                if (rowStr.includes("FULL NAME") || rowStr.includes("HỌ VÀ TÊN") || rowStr.includes("TÊN NHÂN VIÊN")) matchCount++;
                if (rowStr.includes("ID NUMBER") || rowStr.includes("MÃ NV") || rowStr.includes("ID")) matchCount++;
                if (rowStr.includes("TOTAL PAYMENT") || rowStr.includes("THỰC NHẬN") || rowStr.includes("TỔNG")) matchCount++;
                
                if (matchCount >= 2) {
                  headerRowIndex = r;
                  break;
                }
              }
              console.log(`[DEBUG] Header row index for Sheet 1: ${headerRowIndex}`);

              if (headerRowIndex !== -1) {
                foundAnySheet = true;
                sheetProcessed = true;
                const h = rows[headerRowIndex];
                console.log(`[DEBUG] Headers found in ${item.name}:`, h);
                let colIndices: Record<string, number> = {};
                sheet1Headers.forEach((th) => {
                  if (th === "Mã AE" || th === "Business") return;
                  let idx = -1;
                  const thUp = th.toUpperCase();
                  idx = h.findIndex(x => String(x).trim().toUpperCase() === thUp);
                  if (idx === -1) {
                    if (thUp === "FULL NAME") idx = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("FULL NAME") || v.includes("HỌ VÀ TÊN") || v.includes("TÊN NHÂN VIÊN"); });
                    else if (thUp === "ID NUMBER") idx = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("ID") || v.includes("MÃ NV") || v.includes("CMND"); });
                    else if (thUp === "BANK ACCOUNT NUMBER") idx = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("ACCOUNT") || v.includes("TÀI KHOẢN") || v.includes("STK"); });
                    else if (thUp === "TOTAL PAYMENT") idx = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("TOTAL") || v.includes("TỔNG") || v.includes("THỰC NHẬN"); });
                    else if (thUp === "BANK NAME") idx = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("BANK NAME") || v.includes("NGÂN HÀNG"); });
                    else if (thUp === "BANK") idx = h.findIndex(x => { const v = String(x).toUpperCase().trim(); return v === "BANK" || v === "NGÂN HÀNG" || v === "TEN NGAN HANG" || v === "TÊN NGÂN HÀNG"; });
                    else if (thUp === "THÁNG") idx = h.findIndex(x => { const v = String(x).toUpperCase(); return v.includes("THÁNG") || v.includes("MONTH") || v.includes("KỲ"); });
                    else idx = h.findIndex(x => String(x).trim().toUpperCase().includes(thUp));
                  }
                  colIndices[th] = idx;
                });
                console.log(`[DEBUG] Column indices for ${item.name}:`, colIndices);
                
                let centerColIndex = h.findIndex(x => {
                  const v = String(x).trim().toUpperCase();
                  return v === "CENTER" || v.includes("COST CENTER") || v.includes("CENTERS") || v.includes("AE CODE") || v === "AE" || v.includes("MÃ AE") || v.includes("MÃ CENTERS") || v === "MÃ TT" || v.includes("MÃ TT");
                });
                if (centerColIndex === -1) centerColIndex = 19;

                for (let r = headerRowIndex + 1; r < rows.length; r++) {
                  const row = rows[r];
                  const idxTP = colIndices["TOTAL PAYMENT"];
                  const rawTP = (idxTP !== -1 && row[idxTP] !== undefined) ? row[idxTP] : "";
                  const numTP = parseMoneyToNumber(rawTP);
                  const idxAcc = colIndices["Bank Account Number"];
                  const accVal = (idxAcc !== -1 && row[idxAcc] !== undefined) ? String(row[idxAcc]).trim() : "";
                  const idxName = colIndices["Full name"];
                  const nameVal = (idxName !== -1 && row[idxName] !== undefined) ? String(row[idxName]).trim() : "";

                  if ((accVal !== "" || numTP !== 0) && (nameVal !== "" || idxName === -1)) {
                    let obj: any = {};
                    sheet1Headers.forEach(th => {
                      if (th === "L07" || th === "Business") return;
                      const idx = colIndices[th];
                      let val = (idx !== -1 && row[idx] !== undefined) ? row[idx] : "";
                      
                      // Robust NA cleaning
                      const valStr = String(val).toUpperCase().trim();
                      if (valStr === "NA" || valStr === "N/A" || valStr === "#N/A" || valStr === "NAN") {
                        val = "";
                      }
                      
                      obj[th] = val;
                    });

                    const rawCenterVal = String(row[centerColIndex] || "").trim();
                    obj["_rawAE"] = rawCenterVal;
                    const rawCenterKey = cleanText(rawCenterVal).toLowerCase();
                    
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
                console.log(`[DEBUG] Processed ${sheet1Data.length} rows for Sheet 1 from ${item.name}`);
              }
            }

            if (nameUpper.includes("SO SÁNH AE")) {
              foundAnySheet = true;
              sheetProcessed = true;
              for (let r = 1; r < rows.length; r++) {
                const row = rows[r];
                soSanhAeData.push({
                  "ID Number": row[0] || "",
                  "Full name": row[1] || "",
                  "Sheet 1 AE": row[2] || 0,
                  "Bank North AE": row[3] || 0,
                  "Chênh Lệch": row[4] || 0
                });
              }
            }

            if (sheetProcessed) fileProcessedSuccessfully = true;
            await new Promise(resolve => setTimeout(resolve, 0));
          }

          if (fileProcessedSuccessfully) {
            updateAppData(prev => ({
              ...prev,
              Ae_Global_Inputs: prev.Ae_Global_Inputs.map(row => 
                row.id === item.id ? { ...row, status: 'Success' } : row
              )
            }), false);
          } else {
            updateAppData(prev => ({
              ...prev,
              Ae_Global_Inputs: prev.Ae_Global_Inputs.map(row => 
                row.id === item.id ? { ...row, status: 'Error: Invalid format' } : row
              )
            }), false);
          }
        } catch (e: any) {
          updateAppData(prev => ({
            ...prev,
            Ae_Global_Inputs: prev.Ae_Global_Inputs.map(row => 
              row.id === item.id ? { ...row, status: `Error: ${e.message}` } : row
            )
          }), false);
        }
      }

      if (!foundAnySheet) {
        toast.error("Không tìm thấy Sheet 'BANK', 'SHEET 1', 'HOLD' hoặc 'SO SÁNH AE' hợp lệ!");
        return;
      }

      setProcessingMessage("Đang tổng hợp và khử trùng dữ liệu...");
      await new Promise(resolve => setTimeout(resolve, 10));

      const finalSheet1Data: any[] = [];
      const seenSheet1Keys = new Set();
      sheet1Data.forEach(row => {
        const idNum = String(row["ID Number"] || "").trim();
        const l07 = String(row["L07"] || "").trim();
        const total = parseMoneyToNumber(row["TOTAL PAYMENT"]);
        const key = `${idNum}|${l07}|${total}`;
        if (!seenSheet1Keys.has(key)) {
          finalSheet1Data.push(row);
          seenSheet1Keys.add(key);
        }
      });

      const finalBankData: any[] = [];
      const seenBankKeys = new Set();
      bankData.forEach(row => {
        const idNum = String(row["ID Number"] || "").trim();
        const acc = String(row["Bank Account Number"] || "").trim();
        const total = parseMoneyToNumber(row["TOTAL PAYMENT"]);
        const key = `${idNum}|${acc}|${total}`;
        if (!seenBankKeys.has(key)) {
          row["No"] = finalBankData.length + 1;
          finalBankData.push(row);
          seenBankKeys.add(key);
        }
      });

      const finalHoldData: any[] = [];
      const seenHoldKeys = new Set();
      holdData.forEach(row => {
        const idNum = String(row["ID Number"] || "").trim();
        const acc = String(row["Bank Account Number"] || "").trim();
        const total = parseMoneyToNumber(row["TOTAL PAYMENT"]);
        const key = `${idNum}|${acc}|${total}`;
        if (!seenHoldKeys.has(key)) {
          row["No"] = finalHoldData.length + 1;
          
          let type = "Liên ngân hàng";
          if (!acc) type = "⚠️ Thiếu STK";
          else if (acc.length < 6 || acc.length > 25) type = "⚠️ Sai độ dài";
          else if (acc.startsWith("0") || acc.startsWith("10")) type = "Nội bộ VCB";
          row["LOẠI CK"] = type;

          const rawCenterVal = String(row["CENTER NOTE"] || "").trim();
          const rawCenterKey = rawCenterVal.toUpperCase();
          const aeMap = appData.AE_Map;
          
          if (aeMap[rawCenterKey]) {
            row["L07"] = aeMap[rawCenterKey].name;
            row["Business"] = aeMap[rawCenterKey].bus;
          } else if (rawCenterVal) {
            row["L07"] = rawCenterVal;
            row["Business"] = "";
          } else {
            row["L07"] = "";
            row["Business"] = "";
          }

          finalHoldData.push(row);
          seenHoldKeys.add(key);
        }
      });

      const finalSoSanhAeData: any[] = [];
      const seenSoSanhAeKeys = new Set();
      soSanhAeData.forEach(row => {
        const idNum = String(row["ID Number"] || "").trim();
        if (!seenSoSanhAeKeys.has(idNum)) {
          finalSoSanhAeData.push(row);
          seenSoSanhAeKeys.add(idNum);
        }
      });

      updateAppData(prev => ({
        ...prev,
        Bank_North_AE: { headers: ["No", "L07", "Business", "ID Number", "Full name", "Bank Account Number", "Bank", "Tháng", "TOTAL PAYMENT", "LOẠI CK", "Payment details"], data: finalBankData },
        Sheet1_AE: { headers: sheet1Headers, data: finalSheet1Data },
        SoSanh_AE: { headers: ["ID Number", "Full name", "Sheet 1 AE", "Bank North AE", "Chênh Lệch"], data: finalSoSanhAeData },
        Hold_AE: { 
          headers: ["No", "L07", "Business", "ID Number", "Full name", "Bank Account Number", "Bank", "Tháng", "LOẠI CK", "TAX CODE", "Contract No", "TOTAL PAYMENT", "CENTER NOTE", "Sheet Source", "Note"], 
          data: finalHoldData 
        }
      }));

      toast.success(`Xử lý xong: ${finalSheet1Data.length} Sheet1, ${finalBankData.length} Bank, ${finalHoldData.length} Hold.`);
    } catch (error: any) {
      console.error("Error processing AE data:", error);
      toast.error("Lỗi xử lý file: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col overflow-hidden bg-transparent p-4 gap-4"
    >
      {/* Main Content Card */}
      <div className="bg-white/65 backdrop-blur-2xl rounded-2xl shadow-hard-xl flex-1 flex flex-col overflow-hidden border-2 border-slate-900/10">
        {/* Integrated Header & Controls */}
        <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-slate-900/10 bg-white/65 backdrop-blur-2xl shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border-2 border-primary/20 shadow-hard-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-primary tracking-tight uppercase leading-tight">Dữ liệu From AE</h2>
              <p className="text-[0.625rem] font-bold text-primary/40 uppercase tracking-widest">Quản lý file dữ liệu AE • {appData.Sheet1_AE.data.length} Bản ghi</p>
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
                    className="brutal-input pl-10 pr-4 py-2 text-xs w-64 uppercase font-black transition-all focus:w-80 bg-white/70 backdrop-blur-sm"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-primary/30 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center gap-1.5 bg-white/65 p-1.5 rounded-2xl border-2 border-primary/10 shadow-inner">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={addRow}
                    className="p-2.5 border-2 border-primary rounded-xl bg-white text-primary hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-hard-sm active:shadow-none active:translate-y-[1px]"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Thêm dòng mới</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={processAEData}
                    disabled={isProcessing}
                    className={`p-2.5 border-2 border-primary rounded-xl transition-all shadow-hard-sm active:translate-y-[1px] flex items-center justify-center ${isProcessing ? 'bg-primary/50 cursor-not-allowed text-white' : 'bg-[#00FF00] text-black hover:bg-[#00E600]'}`}
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Xử lý dữ liệu AE</TooltipContent>
              </Tooltip>

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
                  <DropdownMenuLabel className="font-black uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">Thao tác dữ liệu</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />
                  
                  <DropdownMenuItem 
                    onClick={() => setShowSearch(!showSearch)}
                    className={`cursor-pointer font-black uppercase text-[0.6875rem] gap-3 p-2.5 rounded-xl transition-all ${showSearch ? 'bg-primary text-white shadow-hard-sm' : 'hover:bg-primary/5'}`}
                  >
                    <Search className="w-4 h-4" />
                    <span>{showSearch ? 'Ẩn tìm kiếm' : 'Hiện tìm kiếm'}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 hover:bg-blue-50 text-blue-600 p-2.5 rounded-xl transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload nhiều File</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />

                  <DropdownMenuItem 
                    onClick={() => setShowClearDialog(true)}
                    className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 focus:bg-rose-50 text-rose-500 p-2.5 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa toàn bộ dữ liệu</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => toast.info("Tính năng đang phát triển")}
                    className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 hover:bg-primary/5 p-2.5 rounded-xl transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Làm mới trạng thái</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className="mx-4 mt-2 p-2 border-2 border-slate-900/10 bg-white/65 backdrop-blur-2xl flex flex-col gap-1.5 text-primary rounded-lg shadow-hard-xs">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-black uppercase text-[0.5625rem] tracking-widest">{processingMessage}</span>
            </div>
            <div className="w-full bg-primary/10 rounded-full h-1.5 overflow-hidden border border-primary/20">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar p-2">
          <div className="border-2 border-slate-900/10 rounded-lg overflow-hidden shadow-hard-md bg-white/65 backdrop-blur-2xl h-full">
            <table>
              <thead className="sticky top-0 z-20 bg-secondary/60 backdrop-blur-lg">
                <tr>
                  <th className="w-10">No</th>
                  <th>TÊN FILE</th>
                  <th className="w-24">BANK</th>
                  <th className="w-20">THÁNG</th>
                  <th>NGUỒN</th>
                  <th className="w-32">TRẠNG THÁI</th>
                  <th className="w-12">XÓA</th>
                </tr>
              </thead>
              <tbody className="border-primary/5">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-32 text-center text-primary/20">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center border-2 border-dashed border-primary/10">
                          <FileSpreadsheet className="w-12 h-12 text-primary/10" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-black uppercase text-lg tracking-tight text-primary">Chưa có file From AE</p>
                          <p className="text-[0.625rem] font-bold uppercase opacity-60 tracking-widest">Thêm dòng hoặc upload file để bắt đầu</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => (
                    <motion.tr 
                      key={row.id}
                      variants={itemVariants}
                      className="group hover:bg-secondary/5 transition-colors"
                    >
                      <td className="text-center">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                          placeholder="Tên file..."
                          className="w-full bg-transparent border-none focus:ring-0 text-[0.6875rem] font-bold text-foreground placeholder:text-foreground/20 p-0"
                        />
                      </td>
                      <td>
                        <select
                          value={row.bank || ''}
                          onChange={(e) => updateRow(row.id, 'bank', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-[0.6875rem] font-black text-foreground text-center p-0 uppercase cursor-pointer appearance-none"
                        >
                          <option value="" className="text-foreground/40">Chọn Bank...</option>
                          <option value="North">North</option>
                          <option value="Thanh Hoa">Thanh Hoa</option>
                          <option value="Phu Tho">Phu Tho</option>
                          <option value="Thai Nguyen">Thai Nguyen</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.month || ''}
                          onChange={(e) => updateRow(row.id, 'month', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-[0.6875rem] font-black text-foreground text-center p-0 uppercase cursor-pointer appearance-none"
                        >
                          <option value="" className="text-foreground/40">Chọn Tháng...</option>
                          {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(m => (
                            <option key={m} value={`${m} 2026`}>{m} 2026</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`file-${row.id}`}
                            className="hidden"
                            accept=".xlsx,.xls"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(row.id, e.target.files[0])}
                          />
                          <button
                            onClick={() => document.getElementById(`file-${row.id}`)?.click()}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-primary font-black text-[0.5625rem] tracking-widest uppercase transition-all shadow-hard-sm active:shadow-none active:translate-y-[1px] ${row.fileObj ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : 'bg-white text-primary hover:bg-primary/5'}`}
                          >
                            <UploadCloud className="w-3 h-3" />
                            {row.fileObj ? 'ĐÃ CHỌN' : 'CHỌN FILE'}
                          </button>
                          {row.fileObj && <span className="text-[0.5625rem] font-bold text-primary/40 truncate max-w-[100px] uppercase">{row.fileObj.name}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            row.status === 'Success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                            row.status === 'ready' ? 'bg-primary/20' :
                            row.status.includes('Error') ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                            'bg-amber-500 animate-pulse'
                          }`} />
                          <span className={`text-[0.625rem] font-black uppercase tracking-wider ${
                            row.status === 'Success' ? 'text-emerald-600' :
                            row.status.includes('Error') ? 'text-rose-600' :
                            'text-primary/60'
                          }`}>{row.status}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="p-1.5 text-primary/10 hover:text-rose-400 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integrated Pagination */}
        <div className="px-6 py-3 border-t-2 border-primary/10 bg-secondary/5 flex items-center justify-between shrink-0">
          <p className="text-[0.625rem] font-black uppercase tracking-widest text-primary/40">
            Hiển thị <span className="text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-primary">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> / <span className="text-primary">{filteredData.length}</span> file
          </p>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-white border-2 border-transparent hover:border-primary rounded transition-all text-primary active:scale-90 disabled:opacity-20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button 
                    key={pageNum} 
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded border-2 font-black text-[0.625rem] transition-all active:scale-90 ${currentPage === pageNum ? 'bg-primary text-white border-primary shadow-hard-sm' : 'bg-white border-transparent hover:border-primary text-primary/60 hover:text-primary'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 hover:bg-white border-2 border-transparent hover:border-primary rounded transition-all text-primary active:scale-90 disabled:opacity-20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept=".xlsx,.xls"
        onChange={handleMultiUpload}
      />

      {/* Confirmation Dialog for Multi-Upload */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl border-2 border-primary shadow-hard max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-primary">Xác nhận tải lên danh sách file</DialogTitle>
            <DialogDescription className="font-bold text-primary/60">
              Phát hiện {pendingUploads.length} file. Vui lòng chọn hành động cho từng file.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto custom-scrollbar my-4 border-2 border-primary/10 rounded-xl">
            <table className="text-left">
              <thead className="sticky top-0 bg-secondary/10 z-10">
                <tr className="border-b-2 border-primary/10">
                  <th>Tên File</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y border-primary/5">
                {choices.map((choice, idx) => (
                  <tr key={idx} className="hover:bg-secondary/5">
                    <td className="truncate max-w-[300px]">{choice.file.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <select 
                          value={choice.action}
                          onChange={(e) => {
                            const newChoices = [...choices];
                            newChoices[idx].action = e.target.value as any;
                            setChoices(newChoices);
                          }}
                          className="brutal-input px-2 py-1 text-[0.625rem] font-black uppercase"
                        >
                          <option value="new">Tạo mới</option>
                          {choice.targetId && <option value="update">Ghi đè</option>}
                          <option value="skip">Bỏ qua</option>
                        </select>
                        {choice.action === 'update' && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin-slow" />}
                        {choice.action === 'new' && <Plus className="w-3 h-3 text-emerald-500" />}
                        {choice.action === 'skip' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-2 border-primary font-black uppercase text-xs">Hủy bỏ</Button>
            <Button onClick={() => confirmUploads(choices)} className="border-2 border-primary bg-primary font-black uppercase text-xs shadow-hard-sm hover:translate-y-[-2px] active:translate-y-[1px]">Xác nhận tải lên</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="border-2 border-primary shadow-hard">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-primary">Xác nhận xoá file và trạng thái</DialogTitle>
            <DialogDescription className="font-bold text-primary/60">
              Bạn có chắc chắn muốn xóa toàn bộ file đã tải lên và đặt lại trạng thái? Các cấu hình Tên File, Bank và Tháng sẽ được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} className="border-2 border-primary font-black uppercase text-xs">Hủy</Button>
            <Button variant="destructive" onClick={clearPageData} className="border-2 border-rose-600 bg-rose-500 font-black uppercase text-xs hover:bg-rose-600">Xác nhận xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
