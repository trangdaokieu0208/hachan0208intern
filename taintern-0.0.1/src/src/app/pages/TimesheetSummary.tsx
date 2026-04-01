import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Calendar, Download, Table2, Search, ChevronDown } from 'lucide-react';
import { useAppData } from '../lib/AppDataContext';
import { getL07FromFileName, getCenterInfoByL07 } from '../lib/center-utils';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
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

export function TimesheetSummary() {
  const { appData } = useAppData();
  const [fromDate, setFromDate] = useState(() => localStorage.getItem('timesheet_fromDate') || '2026-02-14');
  const [toDate, setToDate] = useState(() => localStorage.getItem('timesheet_toDate') || '2026-02-22');
  const [activeTab, setActiveTab] = useState<'roster' | 'summary'>('roster');
  const [editedData, setEditedData] = useState<Record<string, Record<string, any>>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(() => {
    const saved = localStorage.getItem('timesheet_sortConfig');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('timesheet_fromDate', fromDate);
  }, [fromDate]);

  useEffect(() => {
    localStorage.setItem('timesheet_toDate', toDate);
  }, [toDate]);

  useEffect(() => {
    if (sortConfig) {
      localStorage.setItem('timesheet_sortConfig', JSON.stringify(sortConfig));
    } else {
      localStorage.removeItem('timesheet_sortConfig');
    }
  }, [sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };
  
  const formatCurrency = (val: number) => {
    if (isNaN(val) || val === null || val === undefined) return '0';
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  // Dữ liệu thực tế dựa trên appData
  const summaryData = useMemo(() => {
    if (!appData.Q_Roster || appData.Q_Roster.length === 0) return [];

    // 1. Hàm tra cứu đơn giá
    const getSalaryRate = (id: string, type: 'Academic' | 'Admin' | 'Outing' | 'Summer') => {
      const scaleRow = appData.Q_Salary_Scale?.find(s => String(s["ID"] || s["ID Number"]).trim() === id);
      const sCode = scaleRow ? scaleRow["S Code"] : "S1";
      
      let academicRate = 33000;
      let adminRate = 20000;
      
      if (scaleRow) {
        academicRate = parseFloat(scaleRow["Academic Price"]) || 33000;
        adminRate = parseFloat(scaleRow["Administrative Price"]) || 20000;
      }

      if (type === 'Academic') return { rate: academicRate, sCode };
      if (type === 'Admin') return { rate: adminRate, sCode };
      if (type === 'Outing') return { rate: 26316, sCode };
      if (type === 'Summer') return { rate: 29474, sCode };
      return { rate: 0, sCode };
    };

    // 2. Lọc và gom nhóm dữ liệu
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    const filteredRoster = appData.Q_Roster.filter(row => {
      const rowDateStr = row["Date"] || row["Ngày"];
      if (!rowDateStr) return false;
      
      let rowDate: Date;
      if (typeof rowDateStr === 'number') {
        rowDate = new Date(Math.round((rowDateStr - 25569) * 86400 * 1000));
      } else {
        rowDate = new Date(rowDateStr);
      }
      
      return rowDate >= from && rowDate <= to;
    });

    const groupedData: Record<string, any> = {};

    filteredRoster.forEach(t => {
      const id = String(t["ID"] || t["ID Number"] || "").trim();
      if (!id) return;

      const staff = appData.Q_Staff?.find(s => String(s["ID"] || s["ID Number"]).trim() === id) || {};
      
      // Kiểm tra Bank Account Number - Chỉ lấy dữ liệu khi có số tài khoản
      const bankAccount = staff["Bank Account Number"] || staff["STK"] || "";
      if (!String(bankAccount).trim()) return;

      let l07 = staff["L07"] || "";
      let business = staff["Business"] || "";
      const fileName = t._sourceFile || "Unknown File";

      // Logic nhận biết L07 và Business giống CenterDataConfig
      if (!l07 && fileName !== "Unknown File") {
        l07 = getL07FromFileName(fileName);
      }

      if (l07) {
        const centerInfo = getCenterInfoByL07(l07);
        if (centerInfo) {
          business = centerInfo.bus;
        }
      }
      
      const { sCode, rate: academicRate } = getSalaryRate(id, 'Academic');
      const { rate: adminRate } = getSalaryRate(id, 'Admin');
      const { rate: outingRate } = getSalaryRate(id, 'Outing');
      const { rate: summerRate } = getSalaryRate(id, 'Summer');

      // Key Gộp Tổng: L07 + Business + Scale
      const groupId = `${l07}_${business}_${sCode}`;

      if (!groupedData[groupId]) {
        groupedData[groupId] = {
          l07,
          business,
          salaryScale: sCode,
          from: fromDate, 
          to: toDate,
          // Khởi tạo các cột giờ = 0
          inClass: 0, inClassAtls: 0, demo: 0, tutoring: 0, waitingClass: 0, clubActivity: 0,
          parentMeeting: 0, pickUpDropOff: 0, pickUpDropOffAtls: 0, sms: 0, smsAtls: 0,
          progressReport: 0, progressReportAtls: 0, prepareLessonTutoring: 0, meetingTraining: 0,
          pt: 0, discoveryCamp: 0, outing: 0, summer: 0, prepareLessonClubs: 0, conductTest: 0,
          renewalProjects: 0, supportLxo: 0, supportEc: 0, supportMkt: 0,
          academicHours: 0, adminHours: 0,
          academicRate, adminRate, outingRate, summerRate,
          totalSalary: 0,
          chargeEc: 0, chargePtDemo: 0, chargeMktLocal: 0, chargeRenewalProjects: 0,
          chargeDiscoveryCamp: 0, chargeSummerOuting: 0
        };
      }
      
      const row = groupedData[groupId];
      const taskType = t["Type"] || t["Task Type"] || "";
      const duration = parseFloat(t["Duration"] || t["Hours"]) || 0;

      const taskMap: Record<string, string> = {
        'In-class': 'inClass', 'In-class ATLS': 'inClassAtls', 'Demo': 'demo', 'Tutoring': 'tutoring',
        'Waiting class': 'waitingClass', 'Club activity': 'clubActivity', 'Parent meeting': 'parentMeeting',
        'Pick up/ Drop off': 'pickUpDropOff', 'Pick up/ Drop off ATLS': 'pickUpDropOffAtls',
        'SMS': 'sms', 'SMS ATLS': 'smsAtls', 'Progress/Gradebook Report': 'progressReport',
        'Gradebook Report ATLS': 'progressReportAtls', 'Prepare lesson - Tutoring': 'prepareLessonTutoring',
        'Meeting/ Training': 'meetingTraining', 'PT': 'pt', 'Discovery Camp': 'discoveryCamp',
        'Outing': 'outing', 'Summer': 'summer', 'Prepare lesson - Clubs': 'prepareLessonClubs',
        'Conduct test': 'conductTest', 'Renewal Projects': 'renewalProjects',
        'Support LXO': 'supportLxo', 'Support EC': 'supportEc', 'Support MKT': 'supportMkt'
      };

      if (taskMap[taskType]) row[taskMap[taskType]] += duration;

      // Phân loại Academic/Admin
      const academicTasks = [
        "In-class", "In-class ATLS", "Tutoring", 
        "Waiting class", "Club activity", "Demo", "Parent meeting", "PT", "Conduct test"
      ];

      let finalPrice = adminRate;
      if (academicTasks.includes(taskType)) {
        finalPrice = academicRate;
        row.academicHours += duration;
      } else if (['Discovery Camp', 'Summer'].includes(taskType)) {
        finalPrice = summerRate;
      } else if (taskType === 'Outing') {
        finalPrice = outingRate;
      } else {
        row.adminHours += duration;
      }

      let entryTotal = duration * finalPrice;
      if (taskType === "Tutoring" || taskType === "Club activity") {
        entryTotal += (1 * adminRate);
      }

      row.totalSalary += entryTotal;

      // Tính các cột Charge trực tiếp
      if (taskType === "Support EC") row.chargeEc += duration * adminRate;
      if (taskType === "PT" || taskType === "Demo") row.chargePtDemo += entryTotal;
      if (taskType === "Support MKT") row.chargeMktLocal += duration * adminRate;
      if (taskType === "Renewal Projects") row.chargeRenewalProjects += duration * adminRate;
      if (taskType === "Discovery Camp") row.chargeDiscoveryCamp += entryTotal;
      if (taskType === "Outing" || taskType === "Summer") row.chargeSummerOuting += entryTotal;
    });

    // 3. Tính toán tiền (Charge) và Tổng
    let data = Object.values(groupedData).map((row: any, index) => {
      const cLXO = row.totalSalary - row.chargeEc - row.chargePtDemo - row.chargeMktLocal - row.chargeRenewalProjects - row.chargeDiscoveryCamp - row.chargeSummerOuting;
      
      const id = index + 1;
      const overrides = editedData[id] || {};

      return {
        ...row,
        id,
        totalHours: (row.academicHours || 0) + (row.adminHours || 0) + (row.outing || 0) + (row.summer || 0) + (row.discoveryCamp || 0),
        totalSalary: Math.round(row.totalSalary),
        chargeLxo: Math.round(cLXO || 0),
        chargeEc: Math.round(row.chargeEc || 0),
        chargePtDemo: Math.round(row.chargePtDemo || 0),
        chargeMktLocal: Math.round(row.chargeMktLocal || 0),
        chargeRenewalProjects: Math.round(row.chargeRenewalProjects || 0),
        chargeDiscoveryCamp: Math.round(row.chargeDiscoveryCamp || 0),
        chargeSummerOuting: Math.round(row.chargeSummerOuting || 0),
        ...overrides
      };
    });

    if (sortConfig) {
      data.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [appData, fromDate, toDate, sortConfig, editedData]);

  const handleCellChange = (row: any, colKey: string, value: any) => {
    if (!row) return;
    
    let processedValue = value;
    const numericColumns = [
      'chargeLxo', 'chargeEc', 'chargePtDemo', 'chargeMktLocal', 
      'chargeRenewalProjects', 'chargeDiscoveryCamp', 'chargeSummerOuting', 
      'totalSalary'
    ];

    if (numericColumns.includes(colKey)) {
      // Remove currency symbols and formatting then parse
      const cleanValue = String(value).replace(/[^\d.-]/g, '');
      processedValue = parseFloat(cleanValue) || 0;
    }
    
    setEditedData(prev => ({
      ...prev,
      [row.id]: {
        ...(prev[row.id] || {}),
        [colKey]: processedValue
      }
    }));
  };

  const handleExportExcel = () => {
    const exportData = summaryData.map(row => ({
      'L07': row.l07,
      'Business': row.business,
      'Salary Scale': row.salaryScale,
      'From': row.from,
      'To': row.to,
      'In-class': row.inClass,
      'In-class ATLS': row.inClassAtls,
      'Demo': row.demo,
      'Tutoring': row.tutoring,
      'Waiting class': row.waitingClass,
      'Club activity': row.clubActivity,
      'Parent meeting': row.parentMeeting,
      'Pick up/ Drop off': row.pickUpDropOff,
      'Pick up/ Drop off ATLS': row.pickUpDropOffAtls,
      'SMS': row.sms,
      'SMS ATLS': row.smsAtls,
      'Progress/Gradebook Report': row.progressReport,
      'Gradebook Report ATLS': row.progressReportAtls,
      'Prepare lesson - Tutoring': row.prepareLessonTutoring,
      'Meeting/ Training': row.meetingTraining,
      'PT': row.pt,
      'Discovery Camp': row.discoveryCamp,
      'Outing': row.outing,
      'Summer': row.summer,
      'Prepare lesson - Clubs': row.prepareLessonClubs,
      'Conduct test': row.conductTest,
      'Renewal Projects': row.renewalProjects,
      'Support LXO': row.supportLxo,
      'Support EC': row.supportEc,
      'Support MKT': row.supportMkt,
      'Total Hours': row.totalHours,
      'Academic Hours': row.academicHours,
      'Admin Hours': row.adminHours,
      'Total Salary': row.totalSalary,
      'Charge LXO': row.chargeLxo,
      'Charge EC': row.chargeEc,
      'Charge PT-DEMO': row.chargePtDemo,
      'Charge MKT Local': row.chargeMktLocal,
      'Charge Renewal Projects': row.chargeRenewalProjects,
      'Charge Discovery Camp': row.chargeDiscoveryCamp,
      'Charge Summer Outing': row.chargeSummerOuting
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, `Timesheet_Summary_${fromDate}_${toDate}.xlsx`);
  };

  const rosterColumns = useMemo(() => [
    { key: 'id', label: 'No', type: 'text' as const, sortable: true, filterable: true },
    { key: 'l07', label: 'L07', type: 'text' as const, sortable: true, filterable: true },
    { key: 'business', label: 'Business', type: 'text' as const, sortable: true, filterable: true },
    { key: 'salaryScale', label: 'Salary Scale', type: 'text' as const, sortable: true, filterable: true },
    { key: 'from', label: 'From', type: 'text' as const, sortable: true, filterable: true },
    { key: 'to', label: 'To', type: 'text' as const, sortable: true, filterable: true },
    { key: 'inClass', label: 'In-class', type: 'number' as const, sortable: true, filterable: true },
    { key: 'inClassAtls', label: 'In-class ATLS', type: 'number' as const, sortable: true, filterable: true },
    { key: 'demo', label: 'Demo', type: 'number' as const, sortable: true, filterable: true },
    { key: 'tutoring', label: 'Tutoring', type: 'number' as const, sortable: true, filterable: true },
    { key: 'waitingClass', label: 'Waiting class', type: 'number' as const, sortable: true, filterable: true },
    { key: 'clubActivity', label: 'Club activity', type: 'number' as const, sortable: true, filterable: true },
    { key: 'parentMeeting', label: 'Parent meeting', type: 'number' as const, sortable: true, filterable: true },
    { key: 'pickUpDropOff', label: 'Pick up/ Drop off', type: 'number' as const, sortable: true, filterable: true },
    { key: 'pickUpDropOffAtls', label: 'Pick up/ Drop off ATLS', type: 'number' as const, sortable: true, filterable: true },
    { key: 'sms', label: 'SMS', type: 'number' as const, sortable: true, filterable: true },
    { key: 'smsAtls', label: 'SMS ATLS', type: 'number' as const, sortable: true, filterable: true },
    { key: 'progressReport', label: 'Progress/Gradebook Report', type: 'number' as const, sortable: true, filterable: true },
    { key: 'progressReportAtls', label: 'Gradebook Report ATLS', type: 'number' as const, sortable: true, filterable: true },
    { key: 'prepareLessonTutoring', label: 'Prepare lesson - Tutoring', type: 'number' as const, sortable: true, filterable: true },
    { key: 'meetingTraining', label: 'Meeting/ Training', type: 'number' as const, sortable: true, filterable: true },
    { key: 'pt', label: 'PT', type: 'number' as const, sortable: true, filterable: true },
    { key: 'discoveryCamp', label: 'Discovery Camp', type: 'number' as const, sortable: true, filterable: true },
    { key: 'outing', label: 'Outing', type: 'number' as const, sortable: true, filterable: true },
    { key: 'summer', label: 'Summer', type: 'number' as const, sortable: true, filterable: true },
    { key: 'prepareLessonClubs', label: 'Prepare lesson - Clubs', type: 'number' as const, sortable: true, filterable: true },
    { key: 'conductTest', label: 'Conduct test', type: 'number' as const, sortable: true, filterable: true },
    { key: 'renewalProjects', label: 'Renewal Projects', type: 'number' as const, sortable: true, filterable: true },
    { key: 'supportLxo', label: 'Support LXO', type: 'number' as const, sortable: true, filterable: true },
    { key: 'supportEc', label: 'Support EC', type: 'number' as const, sortable: true, filterable: true },
    { key: 'supportMkt', label: 'Support MKT', type: 'number' as const, sortable: true, filterable: true },
    { key: 'totalHours', label: 'Total Hours', type: 'number' as const, sortable: true, filterable: true },
    { key: 'academicHours', label: 'Academic Hours', type: 'number' as const, sortable: true, filterable: true },
    { key: 'adminHours', label: 'Admin Hours', type: 'number' as const, sortable: true, filterable: true },
  ], []);

  const summaryColumns = useMemo(() => [
    { key: 'id', label: 'No', type: 'text' as const, sortable: true, filterable: true },
    { key: 'l07', label: 'L07', type: 'text' as const, sortable: true, filterable: true },
    { key: 'business', label: 'Business', type: 'text' as const, sortable: true, filterable: true },
    { key: 'salaryScale', label: 'Salary Scale', type: 'text' as const, sortable: true, filterable: true },
    { key: 'from', label: 'From', type: 'text' as const, sortable: true, filterable: true },
    { key: 'to', label: 'To', type: 'text' as const, sortable: true, filterable: true },
    { key: 'chargeLxo', label: 'Charge LXO', type: 'currency' as const, sortable: true, filterable: true },
    { key: 'chargeEc', label: 'Charge EC', type: 'currency' as const, sortable: true, filterable: true },
    { key: 'chargePtDemo', label: 'Charge PT-DEMO', type: 'currency' as const, sortable: true, filterable: true },
    { key: 'chargeMktLocal', label: 'Charge MKT Local', type: 'currency' as const, sortable: true, filterable: true },
    { key: 'chargeRenewalProjects', label: 'Charge Renewal Projects', type: 'currency' as const, sortable: true, filterable: true },
    { key: 'chargeDiscoveryCamp', label: 'Charge Discovery Camp', type: 'currency' as const, sortable: true, filterable: true },
    { key: 'chargeSummerOuting', label: 'Charge Summer Outing', type: 'currency' as const, sortable: true, filterable: true },
    { key: 'totalSalary', label: 'Total Salary', type: 'currency' as const, sortable: true, filterable: true },
  ], []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  } as const;

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
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-primary tracking-tight uppercase leading-tight">Timesheet Summary</h2>
              <p className="text-[0.5625rem] font-bold text-primary/40 uppercase tracking-widest">Tính toán lương</p>
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

            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-1.5 rounded-xl border-2 border-primary/10 shadow-inner">
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent border-none text-[0.625rem] font-black text-primary focus:ring-0 p-0 w-24"
              />
              <span className="text-primary/20 font-black">-</span>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent border-none text-[0.625rem] font-black text-primary focus:ring-0 p-0 w-24"
              />
            </div>
            
            <div className="flex items-center gap-1.5 bg-white/65 p-1.5 rounded-2xl border-2 border-primary/10 shadow-inner">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-1.5 border border-primary/50 rounded-lg bg-white text-primary/70 hover:bg-primary/10 hover:text-primary transition-all shadow-sm active:shadow-none active:translate-y-[1px] group">
                        {activeTab === 'roster' ? <Table2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> : <Calculator className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />}
                        <span className="text-[0.625rem] font-black uppercase tracking-[0.1em]">{activeTab === 'roster' ? 'Q_Roster' : 'Summary'}</span>
                        <ChevronDown className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Chuyển bảng dữ liệu</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-48 border-2 border-primary shadow-hard p-1.5">
                  <DropdownMenuLabel className="font-black uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">Chọn bảng dữ liệu</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/20 mx-1.5" />
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('roster')}
                    className={`cursor-pointer font-black uppercase text-[0.6875rem] gap-3 p-2.5 rounded-xl transition-all ${activeTab === 'roster' ? 'bg-primary text-white shadow-hard-sm' : 'hover:bg-primary/5'}`}
                  >
                    <Table2 className="w-4 h-4" />
                    <span>Q_Roster</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('summary')}
                    className={`cursor-pointer font-black uppercase text-[0.6875rem] gap-3 p-2.5 rounded-xl transition-all ${activeTab === 'summary' ? 'bg-primary text-white shadow-hard-sm' : 'hover:bg-primary/5'}`}
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Summary</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-0.5 h-8 bg-primary/10 mx-1.5 rounded-full" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setShowSearch(!showSearch)}
                    className={`p-2.5 border-2 border-primary rounded-xl transition-all shadow-hard-sm active:shadow-none active:translate-y-[1px] group ${showSearch ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-primary hover:text-white'}`}
                  >
                    <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Tìm kiếm</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={handleExportExcel}
                    className="p-2.5 border-2 border-primary rounded-xl bg-white text-primary hover:bg-primary hover:text-white transition-all shadow-hard-sm active:shadow-none active:translate-y-[1px] group"
                  >
                    <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Xuất Excel</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-1 overflow-hidden flex flex-col">
          <div className="border-2 border-primary rounded-lg overflow-hidden shadow-hard-lg bg-white/65 backdrop-blur-2xl flex-1 flex flex-col">
            {summaryData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-primary/20">
                <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center border-2 border-dashed border-primary/10 mb-6">
                  <Calculator className="w-12 h-12 text-primary/10" />
                </div>
                <p className="text-center max-w-sm font-black uppercase text-lg tracking-tight text-primary">Chưa có dữ liệu</p>
                <p className="text-[0.625rem] font-bold uppercase opacity-60 tracking-widest mt-2">Vui lòng chọn khoảng thời gian hợp lệ hoặc import dữ liệu.</p>
              </div>
            ) : (
              <DataTable 
                columns={activeTab === 'roster' ? rosterColumns : summaryColumns}
                data={summaryData}
                isEditable={true}
                onCellChange={handleCellChange}
                externalSearchTerm={searchTerm}
                onExternalSearchChange={setSearchTerm}
                storageKey={`timesheet_summary_${activeTab}`}
                hideSearch={true}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
