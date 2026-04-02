import React, { useState, useMemo, useCallback } from 'react';
import { useAppData } from '../lib/AppDataContext';
import { DEFAULT_CENTERS } from '../constants';
import { getCenterInfoByL07 } from '../lib/center-utils';
import { Building2, Database, Trash2, Download, Settings, Search, Play, RefreshCw, CheckSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DataTable, DataTableRef } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
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

export function DataCenters() {
  const { appData, updateAppData } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const tableRef = React.useRef<DataTableRef>(null);

  // Thêm state cho ngày tháng
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; count: number }>({ isOpen: false, count: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [, setUpdateTrigger] = useState(0);

  const parseMoneyToNumber = (val: any) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    
    let str = String(val).trim();
    
    // Handle comma as decimal separator
    // If comma is the last separator, treat it as decimal
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Comma is likely the decimal separator
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is likely the decimal separator
      str = str.replace(/,/g, '');
    }
    
    const cleanStr = str.replace(/[^0-9.-]+/g, "");
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const handleProcessFiles = async () => {
    setIsProcessing(true);
    setProgress(0);
    try {
      if (!appData.Q_Roster || appData.Q_Roster.length === 0) {
        toast.warning('Không có dữ liệu Q_Roster để xử lý. Vui lòng upload file.');
        return;
      }

      // 1. Hàm tạo bảng tra cứu mức lương (Salary Map)
      const salaryMap: Record<string, any> = {};
      if (appData.Q_Salary_Scale) {
        appData.Q_Salary_Scale.forEach((row: any) => {
          const id = String(row["ID"] || row["ID Number"] || "").trim();
          if (id && id !== "#N/A") {
            salaryMap[id] = {
              scale: row["S Code"],
              academicPrice: parseMoneyToNumber(row["Academic Price"]) || 33000,
              adminPrice: parseMoneyToNumber(row["Administrative Price"]) || 20000
            };
          }
        });
      }

      // 1.5. Hàm tạo bảng tra cứu nhân viên (Staff Map)
      const staffMap: Record<string, any> = {};
      if (appData.Q_Staff) {
        appData.Q_Staff.forEach((row: any) => {
          const id = String(row["ID"] || row["ID Number"] || "").trim();
          if (id) {
            staffMap[id] = row;
          }
        });
      }

      // 2. Lọc dữ liệu Q_Roster theo ngày
      const from = new Date(fromDate);
      const to = new Date(toDate);
      
      const filteredRoster = appData.Q_Roster.filter((row: any) => {
        const rowDateStr = row["Date"] || row["Ngày"];
        if (!rowDateStr) return false;
        
        // Xử lý ngày từ Excel (có thể là số serial hoặc chuỗi)
        let rowDate: Date;
        if (typeof rowDateStr === 'number') {
          rowDate = new Date(Math.round((rowDateStr - 25569) * 86400 * 1000));
        } else {
          rowDate = new Date(rowDateStr);
        }
        
        return rowDate >= from && rowDate <= to;
      });

      // 3. Gom nhóm theo TA và tính toán
      const aggregatedData: Record<string, any> = {};

      filteredRoster.forEach((row: any) => {
        const id = String(row["ID"] || row["ID Number"] || "").trim();
        if (!id) return;

        // Lấy thông tin từ Q_Staff qua staffMap
        const staffInfo = staffMap[id] || {};

        // Kiểm tra Full name - Loại bỏ các dòng đặc biệt
        const fullName = String(staffInfo["Full name"] || staffInfo["Name"] || staffInfo["Họ và tên"] || "").trim();
        const upperFullName = fullName.toUpperCase();
        if (upperFullName.includes("TOTAL COST") || upperFullName.includes("PREPARED BY") || upperFullName.includes("TA SUPERVISOR")) return;

        // Kiểm tra Bank Account Number - Chỉ lấy dữ liệu khi có số tài khoản
        const bankAccount = String(staffInfo["Bank Account Number"] || staffInfo["STK"] || "").trim();
        if (!bankAccount) return;

        const type = row["Type"] || row["Task Type"] || "";
        const duration = parseMoneyToNumber(row["Duration"] || row["Hours"]) || 0;

        const rates = salaryMap[id] || { academicPrice: 33000, adminPrice: 20000 };

        const academicTasks = [
            "In-class", "In-class ATLS", "Tutoring", 
            "Waiting class", "Club activity", "Demo", "Parent meeting", "PT", "Conduct test"
        ];

        let finalPrice = rates.adminPrice;

        if (academicTasks.includes(type)) {
            finalPrice = rates.academicPrice;
        } else if (type === "Discovery Camp" || type === "Summer") {
            finalPrice = 29474;
        } else if (type === "Outing") {
            finalPrice = 26316;
        }

        let total = duration * finalPrice;

        if (type === "Tutoring") {
            total += (1 * rates.adminPrice);
        } else if (type === "Club activity") {
            total += (1 * rates.adminPrice);
        }

        if (!aggregatedData[id]) {
          let l07 = staffInfo["L07"] || "";
          let business = staffInfo["Business"] || "";
          
          // Logic nhận biết L07 và Business giống CenterDataConfig
          if (l07) {
            const centerInfo = getCenterInfoByL07(l07);
            if (centerInfo) {
              business = centerInfo.bus;
            }
          }

          aggregatedData[id] = {
            "L07": l07,
            "Business": business,
            "ID Number": id,
            "Full name": fullName,
            "Salary Scale": rates.scale || "S1",
            "From": fromDate,
            "To": toDate,
            "Bank Account Number": bankAccount,
            "Bank Name": staffInfo["Bank Name"] || staffInfo["Ngân hàng"] || "",
            "CITAD code": staffInfo["CITAD code"] || "",
            "TAX CODE": staffInfo["TAX CODE"] || staffInfo["MST"] || "",
            "Contract No": staffInfo["Contract No"] || "",
            "CHARGE TO LXO": 0,
            "CHARGE TO EC": 0,
            "CHARGE TO PT-DEMO": 0,
            "Charge MKT Local": 0,
            "Charge Renewal Projects": 0,
            "Charge Discovery Camp": 0,
            "Charge Summer Outing": 0,
            "TOTAL PAYMENT": 0
          };
        }

        const aggRow = aggregatedData[id];
        aggRow["TOTAL PAYMENT"] += total;

        // Tính các cột Charge
        if (type === "Support LXO") aggRow["CHARGE TO LXO"] += duration * rates.adminPrice;
        if (type === "Support EC") aggRow["CHARGE TO EC"] += duration * rates.adminPrice;
        if (type === "PT" || type === "Demo") aggRow["CHARGE TO PT-DEMO"] += total;
        if (type === "Support MKT") aggRow["Charge MKT Local"] += duration * rates.adminPrice;
        if (type === "Renewal Projects") aggRow["Charge Renewal Projects"] += duration * rates.adminPrice;
        if (type === "Discovery Camp") aggRow["Charge Discovery Camp"] += total;
        if (type === "Outing" || type === "Summer") aggRow["Charge Summer Outing"] += total;
      });

      // Chuyển object thành array và thêm số thứ tự
      const finalData = Object.values(aggregatedData).map((row, index) => {
        const roundedRow = { ...row };
        const chargeCols = [
          "CHARGE TO LXO", "CHARGE TO EC", "CHARGE TO PT-DEMO", 
          "Charge MKT Local", "Charge Renewal Projects", 
          "Charge Discovery Camp", "Charge Summer Outing"
        ];
        
        let calculatedTotal = 0;
        chargeCols.forEach(col => {
          const val = Math.round(Number(row[col]) || 0);
          roundedRow[col] = val;
          calculatedTotal += val;
        });

        roundedRow["TOTAL PAYMENT"] = calculatedTotal > 0 ? calculatedTotal : Math.round(Number(row["TOTAL PAYMENT"]) || 0);

        return {
          "No": index + 1,
          ...roundedRow
        };
      });

      updateAppData(prev => ({
        ...prev,
        Final_Centers: { ...prev.Final_Centers, data: finalData }
      }), false);

      setProgress(100);
      toast.success(`Đã tính toán xong ${finalData.length} dòng dữ liệu.`);
    } catch (error: any) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi xử lý tệp tin: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportExcel = () => {
    if (appData.Final_Centers.data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(appData.Final_Centers.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Final Centers");
    XLSX.writeFile(wb, "Final_Centers_Report.xlsx");
  };

  const columns = useMemo(() => {
    return appData.Final_Centers.headers
      .filter(header => header.toUpperCase() !== 'NO')
      .map(header => {
      const isAmount = header.toUpperCase().includes('PAYMENT') || header.toUpperCase().includes('TOTAL') || header.toUpperCase().includes('LƯƠNG') || header.toUpperCase().includes('CHARGE');
      return {
        key: header,
        label: header,
        type: (isAmount ? 'currency' : 'text') as 'currency' | 'text',
        sortable: true,
        filterable: true
      };
    });
  }, [appData.Final_Centers.headers]);

  const bulkActions = useMemo(() => [
    {
      label: 'Xóa đã chọn',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'destructive' as const,
      onClick: (selectedRows: any[]) => {
        setDeleteConfirm({ isOpen: true, count: selectedRows.length });
      }
    }
  ], []);

  const handleCellChange = useCallback((row: any, colKey: string, value: any) => {
    updateAppData(prev => {
      const newData = [...prev.Final_Centers.data];
      const rowIndex = newData.findIndex(r => r === row || (r.No && r.No === row.No));
      if (rowIndex === -1) return prev;
      newData[rowIndex] = { ...newData[rowIndex], [colKey]: value };
      return { ...prev, Final_Centers: { ...prev.Final_Centers, data: newData } };
    });
  }, [updateAppData]);

  const handleDeleteRow = useCallback((rowIndex: number) => {
    updateAppData(prev => {
      const newData = [...prev.Final_Centers.data];
      newData.splice(rowIndex, 1);
      // Re-index "No"
      const reindexedData = newData.map((row, idx) => ({ ...row, "No": idx + 1 }));
      return { ...prev, Final_Centers: { ...prev.Final_Centers, data: reindexedData } };
    });
    toast.success('Đã xóa dòng dữ liệu');
  }, [updateAppData]);

  // Tự động xử lý khi có dữ liệu roster nhưng chưa có dữ liệu final
  React.useEffect(() => {
    if (appData.Q_Roster?.length > 0 && appData.Final_Centers.data.length === 0 && !isProcessing) {
      handleProcessFiles();
    }
  }, [appData.Q_Roster, appData.Final_Centers.data.length]);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col h-full overflow-hidden bg-transparent p-1 gap-1"
    >
      {/* Header Card */}
      <motion.div variants={itemVariants} className="bg-white/65 backdrop-blur-2xl rounded-lg p-4 shadow-hard-lg flex items-center justify-between shrink-0 border-2 border-slate-900/10 relative overflow-hidden group">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex -space-x-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border-2 border-primary/20 shadow-hard-sm group-hover:rotate-[-6deg] transition-transform duration-500">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center text-primary border-2 border-primary/20 shadow-hard-sm mt-4 group-hover:rotate-[12deg] transition-transform duration-700">
              <Database className="w-4 h-4" />
            </div>
          </div>
          
          <div className="ml-2">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-2xl font-black text-primary tracking-tighter uppercase leading-none">Final Centers</h2>
              <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[0.5rem] font-black uppercase tracking-widest">Verified</div>
            </div>
            <p className="text-[0.625rem] font-bold text-primary/40 uppercase tracking-[0.2em]">Dữ liệu bảng lương tổng hợp • {appData.Final_Centers.data.length} Bản ghi</p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="relative overflow-hidden"
              >
                <input
                  type="text"
                  placeholder="TÌM KIẾM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full brutal-input pl-8 pr-3 py-1.5 text-[0.625rem] uppercase font-black"
                  autoFocus
                />
                <Search className="w-3.5 h-3.5 text-primary/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </motion.div>
            )}
          </AnimatePresence>
          
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-lg border-2 border-primary/20 bg-white text-primary hover:border-primary hover:bg-primary/5 transition-all shadow-hard-sm active:shadow-none active:translate-y-[1px] group">
                    <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Cài đặt bảng</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56 border-2 border-primary shadow-hard p-1">
              <DropdownMenuLabel className="text-[0.625rem] font-black uppercase tracking-widest text-primary/60 px-2 py-1.5">Thao tác</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setShowSearch(!showSearch)} className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-primary/5 transition-colors">
                <Search className="w-3.5 h-3.5" />
                <span className="text-[0.625rem] font-black uppercase tracking-wider">Tìm kiếm</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportExcel} className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-primary/5 transition-colors">
                <Download className="w-3.5 h-3.5" />
                <span className="text-[0.625rem] font-black uppercase tracking-wider">Xuất Excel</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/10 mx-1" />
              <DropdownMenuLabel className="text-[0.625rem] font-black uppercase tracking-widest text-primary/60 px-2 py-1.5">Hiển thị cột</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/10 mx-1" />
              <div className="max-h-[300px] overflow-auto custom-scrollbar py-1">
                {tableRef.current?.columns.map(col => (
                  <DropdownMenuItem
                    key={col.key}
                    onSelect={(e) => { 
                      e.preventDefault(); 
                      tableRef.current?.toggleColumn(col.key); 
                      setUpdateTrigger(prev => prev + 1);
                    }}
                    className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-primary/5 transition-colors group"
                  >
                    <div className={`w-3.5 h-3.5 rounded border-2 transition-all flex items-center justify-center
                      ${!tableRef.current?.hiddenColumns.has(col.key) ? 'bg-primary border-primary' : 'border-primary/20 group-hover:border-primary/40'}`}>
                      {!tableRef.current?.hiddenColumns.has(col.key) && <CheckSquare className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={`text-[0.625rem] font-black uppercase tracking-wider ${!tableRef.current?.hiddenColumns.has(col.key) ? 'text-primary' : 'text-primary/30'}`}>{col.label}</span>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator className="bg-primary/10 mx-1" />
              <DropdownMenuItem
                onSelect={() => {
                  tableRef.current?.resetTableConfig();
                  setUpdateTrigger(prev => prev + 1);
                }}
                className="flex items-center gap-3 px-2 py-2 rounded cursor-pointer hover:bg-rose-50 text-rose-500 transition-colors group"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[0.625rem] font-black uppercase tracking-wider">Khôi phục mặc định</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Content Card */}
      <motion.div variants={itemVariants} className="bg-white/65 backdrop-blur-2xl rounded-lg shadow-hard-lg flex-1 flex flex-col overflow-hidden border-2 border-slate-900/10">
        <div className="flex-1 overflow-hidden">
          <DataTable 
            ref={tableRef}
            columns={columns}
            data={appData.Final_Centers.data}
            onCellChange={handleCellChange}
            onDeleteRow={handleDeleteRow}
            isEditable={true}
            bulkActions={bulkActions}
            storageKey="final_centers"
            externalSearchTerm={searchTerm}
            onExternalSearchChange={setSearchTerm}
            hideSearch={true}
            hideToolbar={true}
            showFooter={true}
          />
        </div>
      </motion.div>

      <ConfirmDialog 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        onConfirm={() => {
          toast.success(`Đã xóa ${deleteConfirm.count} dòng dữ liệu.`);
          setDeleteConfirm({ ...deleteConfirm, isOpen: false });
        }}
        title="Xác nhận xóa dữ liệu"
        description={`Bạn có chắc chắn muốn xóa ${deleteConfirm.count} dòng đã chọn? Hành động này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        variant="destructive"
      />
    </motion.div>
  );
}
