import React, { useMemo, useState } from 'react';
import { useAppData } from '../lib/AppDataContext';
import { Table2, Download, RefreshCw, ChevronLeft, ChevronRight, Settings, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { parseMoneyToNumber, formatMoneyVND } from '../lib/data-utils';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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

type PivotRow = { center: string; business: string; totals: Record<string, number>; rowTotal: number };

export function PivotSheet() {
  const { appData, updateAppData } = useAppData();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: 'center', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const itemsPerPage = 50;

  const pivotData = useMemo(() => {
    const data = appData.Sheet1_AE.data;
    if (!data || data.length === 0) return null;

    const chargeCols = appData.PivotConfig.chargeCols;
    const result: Record<string, PivotRow> = {};

    data.forEach(row => {
      const center = row["L07"] || "Unknown";
      const business = row["Business"] || "";
      const key = `${center}_${business}`;
      
      if (!result[key]) {
        result[key] = { center: center, business: business, totals: {}, rowTotal: 0 };
        chargeCols.forEach(c => result[key].totals[c.key] = 0);
      }
      
      let rowSum = 0;
      chargeCols.forEach(c => {
        const amount = parseMoneyToNumber(row[c.key]);
        result[key].totals[c.key] += amount;
        rowSum += amount;
      });
      result[key].rowTotal += rowSum;
    });

    let sortedRows = Object.values(result);

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      sortedRows = sortedRows.filter(r => 
        r.center.toLowerCase().includes(s) || 
        r.business.toLowerCase().includes(s)
      );
    }

    if (sortConfig.key && sortConfig.direction) {
      sortedRows.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.key === 'center') {
          valA = a.center;
          valB = b.center;
        } else if (sortConfig.key === 'business') {
          valA = a.business;
          valB = b.business;
        } else if (sortConfig.key === 'rowTotal') {
          valA = a.rowTotal;
          valB = b.rowTotal;
        } else {
          valA = a.totals[sortConfig.key] || 0;
          valB = b.totals[sortConfig.key] || 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default sort by Fr_InputList order if no sort config
      const l07Order: Record<string, number> = {};
      if (appData.Fr_InputList && appData.Fr_InputList.length > 0) {
        appData.Fr_InputList.forEach((item, index) => {
          if (item.l07) {
            const k = String(item.l07).trim().toUpperCase();
            if (l07Order[k] === undefined) l07Order[k] = index;
          }
        });
      }

      sortedRows.sort((a, b) => {
        const keyA = String(a.center).trim().toUpperCase();
        const keyB = String(b.center).trim().toUpperCase();
        const idxA = l07Order[keyA] !== undefined ? l07Order[keyA] : 99999;
        const idxB = l07Order[keyB] !== undefined ? l07Order[keyB] : 99999;
        
        if (idxA !== idxB) return idxA - idxB;
        return a.center.localeCompare(b.center);
      });
    }

    const colTotals: Record<string, number> = {};
    let grandTotal = 0;
    chargeCols.forEach(c => colTotals[c.key] = 0);
    
    sortedRows.forEach(row => {
      chargeCols.forEach(c => {
        colTotals[c.key] += row.totals[c.key];
      });
      grandTotal += row.rowTotal;
    });

    const activeCols = chargeCols.filter(c => colTotals[c.key] > 0 || c.code !== "");

    return { sortedRows, colTotals, grandTotal, activeCols };
  }, [appData.Sheet1_AE.data, appData.PivotConfig.chargeCols, appData.Fr_InputList, sortConfig, searchTerm]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: 'center', direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(1);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="w-3 h-3 text-primary" />;
    return <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const totalPages = pivotData ? Math.ceil(pivotData.sortedRows.length / itemsPerPage) : 0;
  const paginatedRows = pivotData ? pivotData.sortedRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) : [];

  const handleExportExcel = () => {
    if (!pivotData) return;
    
    // Create a simple table for export
    const exportData = pivotData.sortedRows.map(row => {
      const exportRow: any = {
        [appData.PivotConfig.headers['Business']]: row.business,
        [appData.PivotConfig.headers['L07']]: row.center
      };
      pivotData.activeCols.forEach(c => {
        exportRow[`${c.code} - ${c.label}`] = row.totals[c.key];
      });
      exportRow[appData.PivotConfig.headers['GRAND_TOTAL']] = row.rowTotal;
      return exportRow;
    });

    // Add total row
    const totalRow: any = {
      [appData.PivotConfig.headers['Business']]: 'GRAND TOTAL',
      [appData.PivotConfig.headers['L07']]: ''
    };
    pivotData.activeCols.forEach(c => {
      totalRow[`${c.code} - ${c.label}`] = pivotData.colTotals[c.key];
    });
    totalRow[appData.PivotConfig.headers['GRAND_TOTAL']] = pivotData.grandTotal;
    exportData.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pivot Report");
    XLSX.writeFile(wb, "Pivot_Report.xlsx");
  };

  const handleUpdateHeader = (key: string, value: string) => {
    updateAppData(prev => ({
      ...prev,
      PivotConfig: {
        ...prev.PivotConfig,
        headers: { ...prev.PivotConfig.headers, [key]: value }
      }
    }));
  };

  const handleUpdateChargeCode = (key: string, value: string) => {
    updateAppData(prev => ({
      ...prev,
      PivotConfig: {
        ...prev.PivotConfig,
        chargeCols: prev.PivotConfig.chargeCols.map(c => c.key === key ? { ...c, code: value } : c)
      }
    }));
  };

  const handleUpdateChargeLabel = (key: string, value: string) => {
    updateAppData(prev => ({
      ...prev,
      PivotConfig: {
        ...prev.PivotConfig,
        chargeCols: prev.PivotConfig.chargeCols.map(c => c.key === key ? { ...c, label: value } : c)
      }
    }));
  };

  if (!pivotData) {
    return (
      <div className="p-10 text-center space-y-4 bg-background min-h-full flex flex-col items-center justify-center">
        <Table2 className="w-16 h-16 mx-auto text-primary/20" />
        <p className="text-primary/60 italic font-bold uppercase tracking-widest">Chưa có dữ liệu Sheet 1 AE để tạo Pivot.</p>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col h-full overflow-hidden bg-secondary/5 p-4 gap-4"
    >
      {/* Header Card */}
      <motion.div variants={itemVariants} className="bg-card/80 backdrop-blur-md rounded-2xl p-6 shadow-hard-lg flex flex-col md:flex-row items-center justify-between gap-6 shrink-0 border-2 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border-2 border-primary/20 shadow-hard-sm">
            <Table2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight uppercase leading-tight">Pivot Sheet 1</h2>
            <p className="text-[0.625rem] font-bold text-primary/40 uppercase tracking-widest">Báo cáo tổng hợp & Phân tích dữ liệu • {pivotData.sortedRows.length} Bản ghi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-xl border-2 border-primary/20 shadow-hard-sm">
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
                    className="brutal-input pl-10 pr-4 py-2 text-xs w-64 uppercase font-black transition-all focus:w-80 bg-white/80 backdrop-blur-sm"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-primary/30 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-px h-6 bg-primary/10 mx-1" />

            <div className="flex items-center gap-1.5 bg-white/50 p-1.5 rounded-2xl border-2 border-primary/10 shadow-inner">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={handleExportExcel}
                    className="px-6 py-2.5 border-2 border-primary rounded-xl font-black text-[0.6875rem] tracking-[0.1em] uppercase transition-all shadow-hard-sm hover:translate-y-[-2px] active:translate-y-[1px] flex items-center gap-2.5 bg-[#00FF00] text-black hover:bg-[#00E600]"
                  >
                    <Download className="w-4 h-4" />
                    EXPORT EXCEL
                  </button>
                </TooltipTrigger>
                <TooltipContent>Xuất báo cáo Excel</TooltipContent>
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
                  <DropdownMenuLabel className="font-black uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">Thao tác báo cáo</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />
                  
                  <DropdownMenuItem 
                    onClick={() => setShowSearch(!showSearch)}
                    className={`cursor-pointer font-black uppercase text-[0.6875rem] gap-3 p-2.5 rounded-xl transition-all ${showSearch ? 'bg-primary text-white shadow-hard-sm' : 'hover:bg-primary/5'}`}
                  >
                    <Search className="w-4 h-4" />
                    <span>{showSearch ? 'Ẩn tìm kiếm' : 'Hiện tìm kiếm'}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => {}}
                    className="cursor-pointer font-black uppercase text-[0.6875rem] gap-3 hover:bg-primary/5 p-2.5 rounded-xl transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Làm mới dữ liệu</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content Card */}
      <motion.div variants={itemVariants} className="bg-card/80 backdrop-blur-md rounded-2xl shadow-hard-lg flex-1 flex flex-col overflow-hidden border-2 border-primary/20">
        <div className="overflow-auto flex-1 custom-scrollbar p-6">
          <table className="w-full text-left border-collapse border-2 border-primary rounded-xl overflow-hidden">
            <thead 
              className="sticky top-0 z-20 bg-white/50 backdrop-blur-md shadow-md"
            >
              <tr className="border-b-2 border-primary/20 bg-white/50">
                <th rowSpan={2} className="p-3 text-[0.625rem] font-extrabold uppercase border-r-2 border-primary/20 min-w-[120px] text-foreground/60 tracking-widest whitespace-nowrap bg-white/50 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-2">
                    <input 
                      value={appData.PivotConfig.headers['Business']}
                      onChange={(e) => handleUpdateHeader('Business', e.target.value)}
                      className="bg-transparent border-none outline-none w-full font-extrabold uppercase text-foreground placeholder:text-foreground/30"
                    />
                    <button onClick={() => handleSort('business')} className="p-1 hover:bg-primary/10 rounded transition-colors">
                      {getSortIcon('business')}
                    </button>
                  </div>
                </th>
                <th rowSpan={2} className="p-3 text-[0.625rem] font-extrabold uppercase border-r-2 border-primary/20 min-w-[150px] text-foreground/60 tracking-widest whitespace-nowrap">
                  <div className="flex items-center justify-between gap-2">
                    <input 
                      value={appData.PivotConfig.headers['L07']}
                      onChange={(e) => handleUpdateHeader('L07', e.target.value)}
                      className="bg-transparent border-none outline-none w-full font-extrabold uppercase text-foreground placeholder:text-foreground/30"
                    />
                    <button onClick={() => handleSort('center')} className="p-1 hover:bg-primary/10 rounded transition-colors">
                      {getSortIcon('center')}
                    </button>
                  </div>
                </th>
                {pivotData.activeCols.map(c => (
                  <th key={c.key} className="p-3 text-center text-[0.625rem] font-extrabold uppercase text-foreground/60 border-r-2 border-primary/20 border-b-2 border-primary/20 tracking-widest whitespace-nowrap">
                    <input 
                      value={c.code}
                      onChange={(e) => handleUpdateChargeCode(c.key, e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-center font-extrabold uppercase text-foreground placeholder:text-foreground/30"
                    />
                  </th>
                ))}
                <th className="p-3 text-center text-[0.625rem] font-black uppercase border-b-2 border-primary/20 whitespace-nowrap bg-white/50 backdrop-blur-md"></th>
              </tr>
              <tr className="border-b-2 border-primary/20 bg-white/50">
                {pivotData.activeCols.map(c => (
                  <th key={c.key} className="p-3 text-[0.625rem] font-extrabold uppercase border-r-2 border-primary/20 text-foreground/60 tracking-widest whitespace-nowrap bg-white/50 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-2">
                      <input 
                        value={c.label}
                        onChange={(e) => handleUpdateChargeLabel(c.key, e.target.value)}
                        className="bg-transparent border-none outline-none w-full font-extrabold uppercase text-foreground placeholder:text-foreground/30"
                      />
                      <button onClick={() => handleSort(c.key)} className="p-1 hover:bg-primary/10 rounded transition-colors">
                        {getSortIcon(c.key)}
                      </button>
                    </div>
                  </th>
                ))}
                <th className="p-3 text-[0.625rem] font-extrabold uppercase min-w-[150px] text-foreground/60 tracking-widest whitespace-nowrap">
                  <div className="flex items-center justify-between gap-2">
                    <input 
                      value={appData.PivotConfig.headers['GRAND_TOTAL']}
                      onChange={(e) => handleUpdateHeader('GRAND_TOTAL', e.target.value)}
                      className="bg-transparent border-none outline-none w-full font-extrabold uppercase text-foreground placeholder:text-foreground/30"
                    />
                    <button onClick={() => handleSort('rowTotal')} className="p-1 hover:bg-primary/10 rounded transition-colors">
                      {getSortIcon('rowTotal')}
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, idx) => (
                <tr key={idx} className="border-b-2 border-primary/10 last:border-b-0 hover:bg-primary/5 transition-colors font-sans">
                  <td className="p-3 text-xs font-bold border-r-2 border-primary/10 text-foreground uppercase tracking-wider">{row.business}</td>
                  <td className="p-3 text-xs font-semibold border-r-2 border-primary/10 text-foreground">{row.center}</td>
                  {pivotData.activeCols.map(c => {
                    const val = row.totals[c.key];
                    return (
                      <td key={c.key} className="p-3 text-xs text-right font-mono border-r-2 border-primary/10 text-foreground/80 tracking-tighter">
                        {val !== 0 ? formatMoneyVND(val) : '-'}
                      </td>
                    );
                  })}
                  <td className="p-3 text-xs text-right font-bold text-foreground font-mono tracking-tighter">
                    {formatMoneyVND(row.rowTotal)}
                  </td>
                </tr>
              ))}
              <tr className="bg-secondary/10 font-black border-t-2 border-primary/20 text-foreground">
                <td colSpan={2} className="p-4 text-right border-r-2 border-primary/20 uppercase text-[0.625rem] tracking-widest text-foreground/60">GRAND TOTAL</td>
                {pivotData.activeCols.map(c => (
                  <td key={c.key} className="p-4 text-right font-mono border-r-2 border-primary/20">
                    {formatMoneyVND(pivotData.colTotals[c.key])}
                  </td>
                ))}
                <td className="p-4 text-right font-mono">
                  {formatMoneyVND(pivotData.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 bg-white/50 backdrop-blur-md border-t-2 border-primary/20">
            <span className="text-[0.625rem] font-black text-primary/40 uppercase tracking-widest">
              Trang {currentPage} / {totalPages} ({pivotData.sortedRows.length} dòng)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border-2 border-primary rounded-xl disabled:opacity-30 bg-white text-primary transition-all hover:bg-primary/5 active:shadow-none active:translate-y-[1px] shadow-hard-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border-2 border-primary rounded-xl disabled:opacity-30 bg-white text-primary transition-all hover:bg-primary/5 active:shadow-none active:translate-y-[1px] shadow-hard-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
      
      <div className="flex justify-between text-[0.625rem] font-black uppercase tracking-widest text-primary/40">
        <span>Tổng số dòng: {pivotData.sortedRows.length}</span>
        <span>* Dữ liệu được tổng hợp từ Sheet 1 AE</span>
      </div>
    </motion.div>
  );
}
