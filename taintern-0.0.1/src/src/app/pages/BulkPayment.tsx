import React, { useState, useCallback, useMemo } from 'react';
import { useAppData } from '../lib/AppDataContext';
import { CreditCard, PlayCircle, Trash2, Download, CheckCircle2, AlertCircle, FileText, Settings, Search, RefreshCw, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { parseMoneyToNumber, formatMoneyVND, removeVietnameseTones } from '../lib/data-utils';
import * as XLSX from 'xlsx';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/app/components/ui/dialog";
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { DataTable } from '../components/DataTable';
import { motion, AnimatePresence } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

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

export function BulkPayment() {
  const { appData, updateAppData } = useAppData();
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleGenerateReport = useCallback(async () => {
    const src = appData.Bank_North_AE.data;
    if (src.length === 0) {
      toast.error("KHÔNG CÓ DỮ LIỆU: Vui lòng kiểm tra bảng Bank North AE trước khi tạo bảng kê.");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setValidationMsg(null);

    // Artificial delay for better UX feedback
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setProgress((i / steps) * 100);
    }

    try {
      const bankNorthTotal = src.reduce((sum, r) => sum + parseMoneyToNumber(r["TOTAL PAYMENT"] || 0), 0);

      const bizMap: Record<string, string> = {
        "NORTH": "AHN",
        "PHU THO": "APT",
        "THANH HOA": "ATH",
        "THAI NGUYEN": "ATN"
      };

      const bankNorthBizTotals: Record<string, number> = {};
      const idToSheet1: Record<string, any> = {};
      const nameToSheet1: Record<string, any> = {};
      const accToSheet1: Record<string, any> = {};
      
      appData.Sheet1_AE.data.forEach(row => {
        const id = String(row["ID Number"] || "").trim();
        const name = removeVietnameseTones(row["Full name"] || "").toUpperCase();
        const acc = String(row["Bank Account Number"] || "").trim();
        
        const info = {
          biz: row["Business"] || "Unknown",
          bank: String(row["Bank Name"] || "").trim(),
          month: String(row["Tháng"] || "").trim(),
          taxCode: row["TAX CODE"] || "",
          contractNo: row["Contract No"] || ""
        };
        
        if (id) idToSheet1[id] = info;
        if (name) nameToSheet1[name] = info;
        if (acc) accToSheet1[acc] = info;
      });

      src.forEach(row => {
        const id = String(row["ID Number"] || "").trim();
        const name = removeVietnameseTones(row["Full name"] || "").toUpperCase();
        const acc = String(row["Bank Account Number"] || "").trim();
        
        let info = idToSheet1[id];
        if (!info && acc) info = accToSheet1[acc];
        if (!info && name) info = nameToSheet1[name];
        
        const biz = info ? info.biz : "Unknown";
        const amount = parseMoneyToNumber(row["TOTAL PAYMENT"] || 0);
        bankNorthBizTotals[biz] = (bankNorthBizTotals[biz] || 0) + amount;
      });

      const reportBizTotals: Record<string, number> = {};
      let matchedCount = 0;
      let unknownBizCount = 0;

      const data = src.map((row, idx) => {
        const id = String(row["ID Number"] || "").trim();
        const name = removeVietnameseTones(row["Full name"] || "").toUpperCase();
        const acc = String(row["Bank Account Number"] || "").trim();
        
        let sheet1Info = idToSheet1[id];
        if (!sheet1Info && acc) sheet1Info = accToSheet1[acc];
        if (!sheet1Info && name) sheet1Info = nameToSheet1[name];
        
        if (sheet1Info) matchedCount++;
        
        sheet1Info = sheet1Info || { bank: "", month: "", taxCode: "", contractNo: "", biz: "Unknown" };
        
        const bizVal = String(sheet1Info.biz).toUpperCase().trim();
        const monthVal = String(row["_fileMonth"] || sheet1Info.month || "").trim();
        
        let paymentDetails = String(row["Payment details"] || "").trim();
        
        if (!paymentDetails) {
          if (bizVal === "AHN" || bizVal.includes("NORTH")) {
            paymentDetails = "Intern North salary " + monthVal;
          } else if (bizVal === "ATN" || bizVal.includes("THAI NGUYEN") || bizVal.includes("THAINGUYEN")) {
            paymentDetails = "Intern Thai Nguyen salary " + monthVal;
          } else if (bizVal === "ATH" || bizVal.includes("THANH HOA") || bizVal.includes("THANHHOA")) {
            paymentDetails = "Intern Thanh Hoa salary " + monthVal;
          } else if (bizVal === "APT" || bizVal.includes("PHU THO") || bizVal.includes("PHUTHO")) {
            paymentDetails = "Intern Phu Tho salary " + monthVal;
          } else {
            paymentDetails = "Intern salary " + monthVal;
          }
        }
        
        paymentDetails = paymentDetails.trim();
        
        let identifiedBiz = "Unknown";
        for (const [key, code] of Object.entries(bizMap)) {
          if (paymentDetails.toUpperCase().includes(key)) {
            identifiedBiz = code;
            break;
          }
        }
        
        if (identifiedBiz === "Unknown") unknownBizCount++;
        
        const amount = parseMoneyToNumber(row["TOTAL PAYMENT"] || 0);
        reportBizTotals[identifiedBiz] = (reportBizTotals[identifiedBiz] || 0) + amount;
        
        return {
          "Payment Serial Number": idx + 1, 
          "Transaction Type Code": "BT", 
          "Payment Type": "", 
          "Customer Reference No": "",
          "Beneficiary Account No.": String(row["Bank Account Number"] || ""), 
          "Beneficiary Name": removeVietnameseTones(row["Full name"] || ""),
          "Document ID": "", 
          "Place of Issue": "", 
          "ID Issuance Date": "", 
          "Beneficiary Bank Swift Code / IFSC Code": "",
          "Transaction Currency": "VND", 
          "Payment Amount": amount,
          "Charge Type": "OUR", 
          "Payment details": paymentDetails, 
          "Beneficiary - Nick Name": "", 
          "Beneficiary Addr. Line 1": "",
          "Beneficiary Addr. Line 2": ""
        };
      });

      updateAppData(prev => ({
        ...prev,
        BankExport: {
          ...prev.BankExport,
          data: data
        }
      }));

      const reportTotal = data.reduce((sum, r) => sum + r["Payment Amount"], 0);
      const isTotalMatch = Math.abs(reportTotal - bankNorthTotal) < 1;
      
      let msg = `TỔNG CỘNG: ${formatMoneyVND(reportTotal)} `;
      msg += isTotalMatch ? "✅ KHỚP VỚI NGUỒN" : `❌ LỆCH ${formatMoneyVND(reportTotal - bankNorthTotal)}`;

      const bizDiffs: string[] = [];
      const allBiz = new Set([...Object.keys(bankNorthBizTotals), ...Object.keys(reportBizTotals)]);
      allBiz.forEach(biz => {
        const north = bankNorthBizTotals[biz] || 0;
        const report = reportBizTotals[biz] || 0;
        if (Math.abs(north - report) > 1) {
          bizDiffs.push(`${biz}: Lệch ${formatMoneyVND(report - north)}`);
        }
      });

      if (bizDiffs.length > 0) {
        msg += ` | LỖI BUSINESS: ${bizDiffs.join(", ")}`;
      } else {
        msg += " | BUSINESS: ✅ KHỚP";
      }

      if (unknownBizCount > 0) {
        msg += ` | CẢNH BÁO: ${unknownBizCount} dòng không xác định được Business Code.`;
      }

      setValidationMsg(msg);
      const success = isTotalMatch && bizDiffs.length === 0;
      setIsSuccess(success);

      if (success) {
        toast.success(`Tạo bảng kê thành công! Đã khớp ${matchedCount}/${src.length} nhân sự.`);
      } else {
        toast.warning("Bảng kê đã được tạo nhưng phát hiện sai lệch dữ liệu. Vui lòng kiểm tra chi tiết.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Đã xảy ra lỗi trong quá trình xử lý dữ liệu.");
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [appData, updateAppData]);

  const handleClearReport = () => {
    updateAppData(prev => ({
      ...prev,
      BankExport: { ...prev.BankExport, data: [] }
    }));
    setValidationMsg(null);
    setShowClearDialog(false);
    toast.success("Đã xóa dữ liệu bảng kê");
  };

  const handleExportExcel = () => {
    if (appData.BankExport.data.length === 0) return;
    
    const ws = XLSX.utils.json_to_sheet(appData.BankExport.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bank Export");
    XLSX.writeFile(wb, `Bank_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const columns = useMemo(() => {
    return appData.BankExport.headers
      .filter(h => h !== 'Payment Serial Number')
      .map(header => ({
        key: header,
        label: header,
        type: (header === 'Payment Amount' ? 'currency' : 'text') as 'currency' | 'text',
        sortable: true,
        filterable: true
      }));
  }, [appData.BankExport.headers]);

  const handleCellChange = (row: any, colKey: string, value: any) => {
    updateAppData(prev => {
      const newData = [...prev.BankExport.data];
      const rowIndex = newData.findIndex(r => r === row || (r["Payment Serial Number"] && r["Payment Serial Number"] === row["Payment Serial Number"]));
      if (rowIndex === -1) return prev;
      newData[rowIndex] = { ...newData[rowIndex], [colKey]: value };
      return { ...prev, BankExport: { ...prev.BankExport, data: newData } };
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    updateAppData(prev => {
      const newData = [...prev.BankExport.data];
      newData.splice(rowIndex, 1);
      // Re-index Payment Serial Number if it exists
      const updatedData = newData.map((row, idx) => ({
        ...row,
        "Payment Serial Number": idx + 1
      }));
      return { ...prev, BankExport: { ...prev.BankExport, data: updatedData } };
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
      {/* Main Content Card */}
      <div className="bg-white/65 backdrop-blur-2xl rounded-lg shadow-hard-xl flex-1 flex flex-col overflow-hidden border-2 border-slate-900/10">
        {/* Integrated Header & Controls */}
        <div className="px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-primary/20 bg-white/65 backdrop-blur-2xl shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border-2 border-primary/20 shadow-hard-sm">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-primary tracking-tight uppercase leading-tight">Bảng kê thanh toán</h2>
              <p className="text-[0.625rem] font-bold text-primary/40 uppercase tracking-widest">Đối chiếu Bank North AE & Sheet1 AE • {appData.BankExport.data.length} Bản ghi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/65 p-1.5 rounded-2xl border-2 border-primary/10 shadow-inner">
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

              <div className="w-px h-6 bg-primary/10 mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className={`px-6 py-2.5 border-2 border-primary rounded-xl font-black text-[0.6875rem] tracking-[0.1em] uppercase transition-all shadow-hard-sm hover:translate-y-[-2px] active:translate-y-[1px] flex items-center gap-2.5 ${isGenerating ? 'bg-primary/50 cursor-not-allowed text-white' : 'bg-[#00FF00] text-black hover:bg-[#00E600]'}`}
                  >
                    {isGenerating ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                    {isGenerating ? `${Math.round(progress)}%` : "TẠO BẢNG KÊ"}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Tổng hợp dữ liệu từ các nguồn</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-primary/10 mx-1" />

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
                  <DropdownMenuLabel className="font-black uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">Thao tác bảng kê</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />
                  
                  <DropdownMenuItem 
                    onClick={() => setShowSearch(!showSearch)}
                    className={`cursor-pointer font-black uppercase text-[0.6875rem] gap-3 p-2.5 rounded-xl transition-all ${showSearch ? 'bg-primary text-white shadow-hard-sm' : 'hover:bg-primary/5'}`}
                  >
                    <Search className="w-4 h-4" />
                    <span>{showSearch ? 'Ẩn tìm kiếm' : 'Hiện tìm kiếm'}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={handleExportExcel}
                    disabled={appData.BankExport.data.length === 0}
                    className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 hover:bg-emerald-50 text-emerald-600 p-2.5 rounded-xl transition-all disabled:opacity-30"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Excel (.xlsx)</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />

                  <DropdownMenuItem 
                    onClick={() => setShowClearDialog(true)}
                    className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 focus:bg-rose-50 text-rose-500 p-2.5 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa bảng kê hiện tại</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar Info */}
          <div className="w-full lg:w-72 p-6 bg-white/65 backdrop-blur-2xl border-r-2 border-primary/10 overflow-y-auto custom-scrollbar shrink-0">
            <div className="bg-white/65 backdrop-blur-2xl p-6 rounded-2xl border-2 border-slate-900/10 shadow-hard-sm mb-6">
              <h3 className="text-[0.625rem] font-black mb-6 flex items-center gap-2 uppercase tracking-widest text-primary/40">
                <FileText className="w-4 h-4" /> Thông tin bảng kê
              </h3>
              <p className="text-[0.6875rem] font-bold text-primary/60 leading-relaxed uppercase tracking-wider">
                Hệ thống tự động đối chiếu dữ liệu từ Bank North AE với Sheet1 AE để tạo file export chuẩn cho ngân hàng.
              </p>
              
              <div className="mt-6 pt-6 space-y-4 border-t-2 border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="text-[0.625rem] font-black uppercase tracking-widest text-primary/40">Số dòng:</span>
                  <span className="text-xs font-black text-primary">{appData.BankExport.data.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[0.625rem] font-black uppercase tracking-widest text-primary/40">Tổng tiền:</span>
                  <span className="text-xs font-black text-primary">
                    {formatMoneyVND(appData.BankExport.data.reduce((sum, r) => sum + r["Payment Amount"], 0))}
                  </span>
                </div>
              </div>
            </div>

            {isGenerating && (
              <div className="bg-white/65 backdrop-blur-2xl p-6 rounded-2xl border-2 border-slate-900/10 shadow-hard-sm mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[0.625rem] font-black uppercase tracking-widest text-primary/40 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Tiến trình xử lý
                  </h3>
                  <span className="text-xs font-black text-primary">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-secondary/10 h-3 rounded-full border-2 border-primary/10 overflow-hidden">
                  <motion.div 
                    className="bg-[#00FF00] h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            )}

            {validationMsg && !isGenerating && (
              <div className={`p-6 ${isSuccess ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200' : 'bg-amber-50/80 text-amber-700 border-amber-200'} rounded-2xl border-2 shadow-hard-sm backdrop-blur-2xl`}>
                <h4 className={`text-[0.625rem] font-black mb-4 uppercase flex items-center gap-2 tracking-widest`}>
                  {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  Kết quả kiểm tra
                </h4>
                <div className="text-[0.625rem] font-black leading-relaxed uppercase tracking-widest space-y-2">
                  {validationMsg.split('|').map((part, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-current mt-1 shrink-0" />
                      <span>{part.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Table Area */}
          <div className="flex-1 p-2 overflow-hidden flex flex-col">
            <div className="border-2 border-slate-900/10 rounded-xl overflow-hidden shadow-hard-lg bg-white/65 backdrop-blur-2xl flex-1 flex flex-col">
              {appData.BankExport.data.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-primary/20">
                  <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center border-2 border-dashed border-primary/10 mb-6">
                    <CreditCard className="w-12 h-12 text-primary/10" />
                  </div>
                  <p className="text-center max-w-sm font-black uppercase text-lg tracking-tight text-primary">Chưa có dữ liệu bảng kê</p>
                  <p className="text-[0.625rem] font-bold uppercase opacity-60 tracking-widest mt-2">Nhấn "TẠO BẢNG KÊ" để bắt đầu</p>
                </div>
              ) : (
                <DataTable 
                  columns={columns}
                  data={appData.BankExport.data}
                  onCellChange={handleCellChange}
                  onDeleteRow={handleDeleteRow}
                  isEditable={true}
                  externalSearchTerm={searchTerm}
                  onExternalSearchChange={setSearchTerm}
                  storageKey="bulk_payment"
                  showFooter={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="border-2 border-primary shadow-hard">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-primary">Xác nhận xoá dữ liệu</DialogTitle>
            <DialogDescription className="font-bold text-primary/60">
              Bạn có chắc chắn muốn xóa toàn bộ dữ liệu bảng kê? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} className="border-2 border-primary font-black uppercase text-xs">Hủy</Button>
            <Button variant="destructive" onClick={handleClearReport} className="border-2 border-rose-600 bg-rose-500 font-black uppercase text-xs hover:bg-rose-600">Xác nhận xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
