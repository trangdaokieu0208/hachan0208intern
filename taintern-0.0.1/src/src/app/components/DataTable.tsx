import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Filter, Search, Download, CheckSquare, Square, Copy, ChevronLeft, ChevronRight, Table2, Settings, Eraser, Type, Trash2, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'currency';
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
}

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedRows: any[]) => void;
  variant?: 'default' | 'destructive';
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  title?: string;
  onExport?: () => void;
  showFilters?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: any[]) => void;
  onCellChange?: (rowIndex: number, colKey: string, value: any) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onDeleteSelection?: (range: { startR: number; endR: number; startC: number; endC: number }) => void;
  bulkActions?: BulkAction[];
  isEditable?: boolean;
  externalSearchTerm?: string;
  onExternalSearchChange?: (value: string) => void;
  storageKey?: string;
  hideSearch?: boolean;
  hideToolbar?: boolean;
}

const DataRow = React.memo(({ 
  row, rIdx, selectable, selectedRowIds, activeCell, selectionRange, editingCell, editValue, 
  visibleColumns, columnWidths, isEditable, onCellChange, toggleRow, startEditing, handleCellMouseDown, 
  handleCellMouseEnter, handleContextMenu, setEditValue, commitEdit, formatValue, getAlignment 
}: any) => {
  const rowId = row.id || rIdx;
  const isSelected = selectedRowIds.has(rowId);
  const isRowActive = activeCell?.r === rIdx || (selectionRange && rIdx >= Math.min(selectionRange.startR, selectionRange.endR) && rIdx <= Math.max(selectionRange.startR, selectionRange.endR));
  
  return (
    <tr className={`transition-all duration-150 group ${selectable ? 'cursor-pointer' : 'cursor-default'} ${isSelected ? 'bg-primary/5' : ''} ${isRowActive ? 'bg-secondary/5' : 'hover:bg-primary/5 hover:shadow-[inset_0_1px_0_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.05)] relative z-0 hover:z-10'}`}>
      {selectable && (
        <td 
          onClick={() => toggleRow(rowId)} 
          className="text-primary/40 transition-colors whitespace-nowrap border-b border-r border-primary/5 hover:bg-primary/10"
          style={{ padding: 'var(--table-padding)' }}
        >
          <div className="flex items-center justify-center">
            {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 opacity-10 group-hover:opacity-100 transition-opacity" />}
          </div>
        </td>
      )}
      {visibleColumns.map((col: any, cIdx: number) => {
        const isActive = activeCell?.r === rIdx && activeCell?.c === cIdx;
        const isEditing = editingCell?.r === rIdx && editingCell?.c === cIdx;
        const isInRange = selectionRange && rIdx >= Math.min(selectionRange.startR, selectionRange.endR) && rIdx <= Math.max(selectionRange.startR, selectionRange.endR) && cIdx >= Math.min(selectionRange.startC, selectionRange.endC) && cIdx <= Math.max(selectionRange.startC, selectionRange.endC);
        const minR = selectionRange ? Math.min(selectionRange.startR, selectionRange.endR) : -1, maxR = selectionRange ? Math.max(selectionRange.startR, selectionRange.endR) : -1;
        const minC = selectionRange ? Math.min(selectionRange.startC, selectionRange.endC) : -1, maxC = selectionRange ? Math.max(selectionRange.startC, selectionRange.endC) : -1;
        const isTopEdge = isInRange && rIdx === minR, isBottomEdge = isInRange && rIdx === maxR, isLeftEdge = isInRange && cIdx === minC, isRightEdge = isInRange && cIdx === maxC;
        return (
          <td
            key={col.key}
            onMouseDown={(e) => handleCellMouseDown(e, rIdx, cIdx)}
            onMouseEnter={(e) => handleCellMouseEnter(e, rIdx, cIdx)}
            onDoubleClick={() => startEditing(rIdx, cIdx)}
            onContextMenu={(e) => handleContextMenu(e, rIdx, cIdx)}
            className={`text-[0.6875rem] font-medium text-foreground/80 whitespace-nowrap select-none border-b border-r border-primary/5 ${getAlignment(col.type)} transition-all relative hover:bg-primary/10 hover:text-primary ${isInRange ? 'bg-primary/5 z-10' : ''} ${isActive ? 'ring-2 ring-inset ring-primary z-20 bg-white/90 shadow-hard-sm' : ''} ${!isActive && !isInRange ? 'group-hover:text-primary' : ''} ${col.type === 'currency' || col.type === 'number' ? 'font-mono tracking-tighter' : ''}`}
            style={{ padding: 'var(--table-padding)', width: columnWidths[col.key] ? `${columnWidths[col.key]}px` : undefined, minWidth: columnWidths[col.key] ? `${columnWidths[col.key]}px` : undefined, maxWidth: columnWidths[col.key] ? `${columnWidths[col.key]}px` : undefined, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {isInRange && <div className={`absolute inset-0 pointer-events-none z-10 ${isTopEdge ? 'border-t-2 border-primary/20' : ''} ${isBottomEdge ? 'border-b-2 border-primary/20' : ''} ${isLeftEdge ? 'border-l-2 border-primary/20' : ''} ${isRightEdge ? 'border-r-2 border-primary/20' : ''}`} />}
            {isEditing ? (
              <div className="absolute inset-0 z-30 p-0.5 bg-white/95 shadow-hard ring-2 ring-primary">
                <input ref={inputRef as any} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} className="w-full h-full px-2 py-0.5 bg-transparent border-none focus:ring-0 text-[0.625rem] font-black text-foreground uppercase" />
              </div>
            ) : (
              <span className="relative z-0">{formatValue(row[col.key], col.type)}</span>
            )}
          </td>
        );
      })}
    </tr>
  );
});

DataRow.displayName = 'DataRow';

export interface DataTableRef {
  columns: Column[];
  hiddenColumns: Set<string>;
  toggleColumn: (key: string) => void;
  resetTableConfig: () => void;
}

export const DataTable = React.forwardRef<DataTableRef, DataTableProps>(({ 
  columns, 
  data, 
  title, 
  onExport, 
  selectable = false,
  onSelectionChange,
  onCellChange,
  onDeleteRow,
  onDeleteSelection,
  isEditable = true,
  externalSearchTerm,
  onExternalSearchChange,
  storageKey,
  hideSearch = false,
  hideToolbar = false
}, ref) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters] = useState<Record<string, string>>({});
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = onExternalSearchChange || setInternalSearchTerm;
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; r: number; c: number } | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Grid selection & editing
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ startR: number; endR: number; startC: number; endC: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  // Load all configurations from localStorage
  useEffect(() => {
    if (storageKey) {
      // Hidden columns
      const savedHidden = localStorage.getItem(`dt_hidden_${storageKey}`);
      if (savedHidden) {
        try { setHiddenColumns(new Set(JSON.parse(savedHidden))); } catch (e) { console.error(e); }
      }

      // Column widths
      const savedWidths = localStorage.getItem(`dt_widths_${storageKey}`);
      if (savedWidths) {
        try { setColumnWidths(JSON.parse(savedWidths)); } catch (e) { console.error(e); }
      }

      // Sort config
      const savedSort = localStorage.getItem(`dt_sort_${storageKey}`);
      if (savedSort) {
        try { setSortConfig(JSON.parse(savedSort)); } catch (e) { console.error(e); }
      }

      // Items per page
      const savedItemsPerPage = localStorage.getItem(`dt_ipp_${storageKey}`);
      if (savedItemsPerPage) {
        try { 
          const parsed = JSON.parse(savedItemsPerPage);
          if (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0) {
            setItemsPerPage(parsed);
          }
        } catch (e) { 
          console.error(e); 
        }
      }
    }
  }, [storageKey]);

  // Save hidden columns
  useEffect(() => {
    if (storageKey) localStorage.setItem(`dt_hidden_${storageKey}`, JSON.stringify(Array.from(hiddenColumns)));
  }, [hiddenColumns, storageKey]);

  // Save sort config
  useEffect(() => {
    if (storageKey) localStorage.setItem(`dt_sort_${storageKey}`, JSON.stringify(sortConfig));
  }, [sortConfig, storageKey]);

  // Save items per page
  useEffect(() => {
    if (storageKey) localStorage.setItem(`dt_ipp_${storageKey}`, JSON.stringify(itemsPerPage));
  }, [itemsPerPage, storageKey]);

  // Save column widths
  const saveColumnWidths = (widths: Record<string, number>) => {
    if (storageKey) localStorage.setItem(`dt_widths_${storageKey}`, JSON.stringify(widths));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      
      const { colKey, startX, startWidth } = resizingRef.current;
      const delta = e.pageX - startX;
      const newWidth = Math.max(50, startWidth + delta);
      
      setColumnWidths(prev => ({
        ...prev,
        [colKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        const { colKey } = resizingRef.current;
        setColumnWidths(prev => {
          saveColumnWidths(prev);
          return prev;
        });
        resizingRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleResizeStart = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest('th');
    if (!th) return;
    
    resizingRef.current = {
      colKey,
      startX: e.pageX,
      startWidth: th.offsetWidth
    };
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  
  const tableRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = data.filter((row, idx) => selectedRowIds.has(row.id || idx));
      onSelectionChange(selectedRows);
    }
  }, [selectedRowIds, data, onSelectionChange]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const visibleColumns = useMemo(() => 
    columns.filter(col => !hiddenColumns.has(col.key)),
    [columns, hiddenColumns]
  );

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(lowerSearch)
        )
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(row =>
          String(row[key]).toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, sortConfig, filters, searchTerm]);

  const totalPages = itemsPerPage === Infinity ? 1 : Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    if (itemsPerPage === Infinity) return filteredAndSortedData;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(start, start + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const resetTableConfig = () => {
    if (storageKey) {
      localStorage.removeItem(`dt_hidden_${storageKey}`);
      localStorage.removeItem(`dt_widths_${storageKey}`);
      localStorage.removeItem(`dt_sort_${storageKey}`);
      localStorage.removeItem(`dt_ipp_${storageKey}`);
      setHiddenColumns(new Set());
      setColumnWidths({});
      setSortConfig(null);
      setItemsPerPage(50);
      setCurrentPage(1);
      toast.success('Đã khôi phục cấu hình bảng mặc định');
    }
  };

  const toggleColumn = (key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  React.useImperativeHandle(ref, () => ({
    columns,
    hiddenColumns,
    toggleColumn,
    resetTableConfig
  }));

  const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) return '';
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
      case 'number':
        return new Intl.NumberFormat('vi-VN').format(value);
      case 'date':
        try {
          return new Date(value).toLocaleDateString('vi-VN');
        } catch (e) {
          return String(value);
        }
      default:
        return String(value);
    }
  };

  const getAlignment = (type?: string) => {
    switch (type) {
      case 'number':
      case 'currency':
        return 'text-right';
      case 'date':
        return 'text-center';
      default:
        return 'text-left';
    }
  };

  const toggleAll = () => {
    if (selectedRowIds.size === filteredAndSortedData.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredAndSortedData.map((row, idx) => row.id || idx)));
    }
  };

  const toggleRow = (id: string | number) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRowIds(next);
  };

  const startEditing = (r: number, c: number, clear: boolean = false) => {
    if (!isEditable) return;
    const col = visibleColumns[c];
    const row = filteredAndSortedData[r];
    setEditingCell({ r, c });
    setEditValue(clear ? '' : String(row[col.key] || ''));
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        if (!clear) {
          if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
            inputRef.current.select();
          }
        }
      }
    }, 0);
  };

  const commitEdit = () => {
    if (editingCell && onCellChange) {
      const col = visibleColumns[editingCell.c];
      onCellChange(editingCell.r, col.key, editValue);
    }
    setEditingCell(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  const handleContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (r !== -1) {
      setActiveCell({ r, c });
    }
    setContextMenu({ x: e.clientX, y: e.clientY, r, c });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleGlobalClick = () => closeContextMenu();
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleHeaderMouseDown = (e: React.MouseEvent, cIdx: number) => {
    if (e.button !== 0) return;
    if (filteredAndSortedData.length === 0) return;
    setIsSelecting(true);
    setActiveCell({ r: 0, c: cIdx });
    setSelectionRange({ startR: 0, endR: filteredAndSortedData.length - 1, startC: cIdx, endC: cIdx });
  };

  const handleHeaderMouseEnter = (e: React.MouseEvent, cIdx: number) => {
    if (e.buttons === 1 && selectionRange && selectionRange.startR === 0 && selectionRange.endR === filteredAndSortedData.length - 1) {
      setSelectionRange(prev => prev ? { ...prev, endC: cIdx } : null);
    }
  };

  const copyColumn = (cIdx: number) => {
    const col = visibleColumns[cIdx];
    const values = filteredAndSortedData.map(row => formatValue(row[col.key], col.type));
    try {
      navigator.clipboard.writeText(values.join('\n'));
      toast.success(`Đã sao chép cột ${col.label}`);
    } catch (err) {
      console.error('Failed to copy!', err);
      toast.error('Không thể sao chép vào clipboard. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const copySelection = () => {
    if (selectionRange) {
      const { startR, endR, startC, endC } = selectionRange;
      const minR = Math.min(startR, endR);
      const maxR = Math.max(startR, endR);
      const minC = Math.min(startC, endC);
      const maxC = Math.max(startC, endC);
      
      try {
        if (minR === maxR && minC === maxC) {
          const row = filteredAndSortedData[minR];
          const col = visibleColumns[minC];
          const val = formatValue(row[col.key], col.type);
          navigator.clipboard.writeText(val);
          toast.success('Đã sao chép nội dung ô');
        } else {
          const rows = [];
          for (let i = minR; i <= maxR; i++) {
            const rowVals = [];
            for (let j = minC; j <= maxC; j++) {
              const col = visibleColumns[j];
              rowVals.push(formatValue(filteredAndSortedData[i][col.key], col.type));
            }
            rows.push(rowVals.join('\t'));
          }
          navigator.clipboard.writeText(rows.join('\n'));
          toast.success(`Đã sao chép ${rows.length} dòng, ${maxC - minC + 1} cột`);
        }
      } catch (err) {
        console.error('Failed to copy!', err);
        toast.error('Không thể sao chép vào clipboard. Vui lòng kiểm tra quyền truy cập.');
      }
    } else if (activeCell) {
      try {
        const row = filteredAndSortedData[activeCell.r];
        const val = formatValue(row[visibleColumns[activeCell.c].key], visibleColumns[activeCell.c].type);
        navigator.clipboard.writeText(val);
        toast.success('Đã sao chép nội dung ô');
      } catch (err) {
        console.error('Failed to copy!', err);
        toast.error('Không thể sao chép vào clipboard. Vui lòng kiểm tra quyền truy cập.');
      }
    }
  };

  const handleCellMouseDown = (e: React.MouseEvent, r: number, c: number) => {
    if (e.button !== 0) return;
    setIsSelecting(true);
    if (e.shiftKey && activeCell) {
      setSelectionRange({ startR: activeCell.r, endR: r, startC: activeCell.c, endC: c });
    } else {
      setActiveCell({ r, c });
      setSelectionRange({ startR: r, endR: r, startC: c, endC: c });
    }
  };

  const handleCellMouseEnter = (e: React.MouseEvent, r: number, c: number) => {
    if (e.buttons === 1 && selectionRange) {
      setSelectionRange(prev => prev ? { ...prev, endR: r, endC: c } : null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCell) {
        if (e.key === 'Enter' && !e.altKey) {
          e.preventDefault();
          const { r, c } = editingCell;
          commitEdit();
          const nextR = Math.min(r + 1, filteredAndSortedData.length - 1);
          setActiveCell({ r: nextR, c });
          if (nextR !== r) setTimeout(() => startEditing(nextR, c), 10);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          const { r, c } = editingCell;
          commitEdit();
          let nextR = r, nextC = c;
          if (e.shiftKey) {
            if (c > 0) nextC = c - 1;
            else if (r > 0) { nextR = r - 1; nextC = visibleColumns.length - 1; }
          } else {
            if (c < visibleColumns.length - 1) nextC = c + 1;
            else if (r < filteredAndSortedData.length - 1) { nextR = r + 1; nextC = 0; }
          }
          setActiveCell({ r: nextR, c: nextC });
          if (nextR !== r || nextC !== c) setTimeout(() => startEditing(nextR, nextC), 10);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
        return;
      }

      if (!tableRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (!activeCell) return;
      const { r, c } = activeCell;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextR = Math.min(r + 1, filteredAndSortedData.length - 1);
        setActiveCell({ r: nextR, c });
        if (e.shiftKey && selectionRange) setSelectionRange({ ...selectionRange, endR: nextR });
        else setSelectionRange({ startR: nextR, endR: nextR, startC: c, endC: c });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextR = Math.max(r - 1, 0);
        setActiveCell({ r: nextR, c });
        if (e.shiftKey && selectionRange) setSelectionRange({ ...selectionRange, endR: nextR });
        else setSelectionRange({ startR: nextR, endR: nextR, startC: c, endC: c });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextC = Math.min(c + 1, visibleColumns.length - 1);
        setActiveCell({ r, c: nextC });
        if (e.shiftKey && selectionRange) setSelectionRange({ ...selectionRange, endC: nextC });
        else setSelectionRange({ startR: r, endR: r, startC: nextC, endC: nextC });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const nextC = Math.max(c - 1, 0);
        setActiveCell({ r, c: nextC });
        if (e.shiftKey && selectionRange) setSelectionRange({ ...selectionRange, endC: nextC });
        else setSelectionRange({ startR: r, endR: r, startC: nextC, endC: nextC });
      } else if (e.key === 'Tab') {
        e.preventDefault();
        let nextC = e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, visibleColumns.length - 1);
        setActiveCell({ r, c: nextC });
        setSelectionRange({ startR: r, endR: r, startC: nextC, endC: nextC });
      } else if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault();
        startEditing(r, c);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (onCellChange) {
          if (selectionRange) {
            const { startR, endR, startC, endC } = selectionRange;
            const minR = Math.min(startR, endR), maxR = Math.max(startR, endR);
            const minC = Math.min(startC, endC), maxC = Math.max(startC, endC);
            for (let i = minR; i <= maxR; i++) for (let j = minC; j <= maxC; j++) onCellChange(i, visibleColumns[j].key, '');
            toast.success(`Đã xóa dữ liệu trong ${ (maxR - minR + 1) * (maxC - minC + 1) } ô`);
          } else onCellChange(r, visibleColumns[c].key, '');
        }
      } else if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        toggleAll();
      } else if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        copySelection();
      } else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        try {
          navigator.clipboard.readText().then(text => {
            if (!onCellChange) return;
            const rows = text.split('\n');
            rows.forEach((rowText, rOffset) => {
              const cells = rowText.split('\t');
              cells.forEach((cellText, cOffset) => {
                const targetR = r + rOffset, targetC = c + cOffset;
                if (targetR < filteredAndSortedData.length && targetC < visibleColumns.length) onCellChange(targetR, visibleColumns[targetC].key, cellText.trim());
              });
            });
            toast.success('Đã dán dữ liệu');
          });
        } catch (err) {
          console.error('Failed to read clipboard!', err);
          toast.error('Không thể dán từ clipboard. Vui lòng kiểm tra quyền truy cập.');
        }
      } else if (/^[a-zA-Z0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        startEditing(r, c, true);
        setEditValue(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredAndSortedData, activeCell, editingCell, editValue, visibleColumns, isEditable, onCellChange]);

  return (
    <>
      <div ref={tableRef} className="flex flex-col h-full outline-none bg-white/65 backdrop-blur-2xl overflow-hidden">
        {/* Integrated Toolbar */}
        {!hideToolbar && (
        <div className="px-2 py-1 border-b-2 border-primary/10 flex items-center justify-between bg-secondary/5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {title && <h3 className="text-xs font-black text-primary uppercase tracking-widest">{title}</h3>}
            {!hideSearch && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="TÌM KIẾM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="brutal-input pl-8 pr-3 py-1 text-[0.625rem] w-48 uppercase font-black"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/40" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {onExport && (
              <button
                onClick={onExport}
                className="brutal-btn-secondary px-3 py-1 text-[0.625rem] flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                <span>XUẤT EXCEL</span>
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 hover:bg-primary/5 rounded border border-primary/10 transition-colors text-primary/40 hover:text-primary">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-2 border-primary shadow-hard p-1">
                <DropdownMenuLabel className="text-[0.625rem] font-black uppercase tracking-widest text-primary/60 px-2 py-1.5">Hiển thị cột</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/10 mx-1" />
                <div className="max-h-[300px] overflow-auto custom-scrollbar py-1">
                  {columns.map(col => (
                    <DropdownMenuItem
                      key={col.key}
                      onSelect={(e) => { e.preventDefault(); toggleColumn(col.key); }}
                      className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-primary/5 transition-colors group"
                    >
                      <div className={`w-3.5 h-3.5 rounded border-2 transition-all flex items-center justify-center
                        ${!hiddenColumns.has(col.key) ? 'bg-primary border-primary' : 'border-primary/20 group-hover:border-primary/40'}`}>
                        {!hiddenColumns.has(col.key) && <CheckSquare className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-[0.625rem] font-black uppercase tracking-wider ${!hiddenColumns.has(col.key) ? 'text-primary' : 'text-primary/30'}`}>{col.label}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator className="bg-primary/10 mx-1" />
                <DropdownMenuItem
                  onSelect={resetTableConfig}
                  className="flex items-center gap-3 px-2 py-2 rounded cursor-pointer hover:bg-rose-50 text-rose-500 transition-colors group"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[0.625rem] font-black uppercase tracking-wider">Khôi phục mặc định</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        )}

        {/* Table Container */}
        <div 
          tabIndex={0}
          className="flex-1 overflow-auto custom-scrollbar outline-none bg-transparent relative"
          onFocus={() => !activeCell && setActiveCell({ r: 0, c: 0 })}
        >
          <table className={`w-full min-w-max border-collapse font-sans ${isSelecting ? 'select-none' : ''}`}>
            <thead className="bg-white/75 backdrop-blur-md sticky top-0 z-30 shadow-[0_2px_10px_0_rgba(0,0,0,0.05)] font-display">
              <tr>
                {selectable && (
                  <th 
                    className="text-[0.5625rem] font-bold uppercase tracking-widest text-foreground/40 bg-white/75 backdrop-blur-md sticky top-0 z-40 w-10 text-center border-b-2 border-primary/20"
                    style={{ padding: 'var(--table-padding)' }}
                  >
                    <button onClick={toggleAll} className="flex items-center justify-center hover:text-primary transition-colors mx-auto">
                      {selectedRowIds.size > 0 && selectedRowIds.size === filteredAndSortedData.length ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                  </th>
                )}
                {visibleColumns.map((col, cIdx) => {
                  const isColActive = activeCell?.c === cIdx || (selectionRange && cIdx >= Math.min(selectionRange.startC, selectionRange.endC) && cIdx <= Math.max(selectionRange.startC, selectionRange.endC));
                  return (
                    <th
                      key={col.key}
                      onMouseDown={(e) => handleHeaderMouseDown(e, cIdx)}
                      onMouseEnter={(e) => handleHeaderMouseEnter(e, cIdx)}
                      onContextMenu={(e) => handleContextMenu(e, -1, cIdx)}
                      className={`text-[0.5625rem] font-bold uppercase tracking-widest bg-white/75 backdrop-blur-md sticky top-0 z-40 whitespace-nowrap hover:bg-secondary/20 transition-colors cursor-pointer select-none text-center border-b-2 border-r border-primary/20 group relative ${isColActive ? 'text-primary bg-primary/10' : 'text-foreground/40'}`}
                      style={{ padding: 'var(--table-padding)', width: columnWidths[col.key] ? `${columnWidths[col.key]}px` : undefined, minWidth: columnWidths[col.key] ? `${columnWidths[col.key]}px` : undefined, maxWidth: columnWidths[col.key] ? `${columnWidths[col.key]}px` : undefined, overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>{col.label}</span>
                        {col.sortable !== false && (
                          <button onClick={(e) => { e.stopPropagation(); handleSort(col.key); }} className="hover:text-primary transition-colors">
                            {sortConfig?.key === col.key ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <Filter className="w-2.5 h-2.5 opacity-20 hover:opacity-100" />}
                          </button>
                        )}
                      </div>
                      <div onMouseDown={(e) => handleResizeStart(e, col.key)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors z-40" />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y border-primary/5">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="px-6 py-24 text-center bg-transparent">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-secondary/5 rounded-full flex items-center justify-center border-2 border-dashed border-primary/10">
                        <Search className="w-8 h-8 text-primary/10" />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-foreground font-black uppercase tracking-tight text-sm">Không tìm thấy dữ liệu</p>
                        <p className="text-foreground/40 font-bold text-[0.5625rem] uppercase tracking-widest leading-relaxed">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rIdx) => (
                  <DataRow 
                    key={row.id || rIdx}
                    row={row}
                    rIdx={rIdx}
                    selectable={selectable}
                    selectedRowIds={selectedRowIds}
                    activeCell={activeCell}
                    selectionRange={selectionRange}
                    editingCell={editingCell}
                    editValue={editValue}
                    visibleColumns={visibleColumns}
                    columnWidths={columnWidths}
                    isEditable={isEditable}
                    onCellChange={onCellChange}
                    toggleRow={toggleRow}
                    startEditing={startEditing}
                    handleCellMouseDown={handleCellMouseDown}
                    handleCellMouseEnter={handleCellMouseEnter}
                    handleContextMenu={handleContextMenu}
                    setEditValue={setEditValue}
                    commitEdit={commitEdit}
                    formatValue={formatValue}
                    getAlignment={getAlignment}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="px-4 py-2 bg-secondary/5 border-t-2 border-primary/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[0.5625rem] font-black uppercase tracking-widest text-primary/40">Dòng mỗi trang</span>
              <select
                value={itemsPerPage === Infinity ? 'all' : (itemsPerPage || '')}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? Infinity : Number(e.target.value);
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
                className="bg-white/80 border-2 border-primary rounded px-1.5 py-0.5 text-[0.5625rem] font-black focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer uppercase"
              >
                {[20, 50, 100, 200, 500].map(size => <option key={size} value={size}>{size}</option>)}
                <option value="all">Tất cả</option>
              </select>
            </div>
            <div className="h-3 w-px bg-primary/10" />
            <p className="text-[0.5625rem] font-black uppercase tracking-widest text-primary/40">
              Hiển thị <span className="text-primary">{filteredAndSortedData.length > 0 ? (currentPage - 1) * (itemsPerPage === Infinity ? filteredAndSortedData.length : itemsPerPage) + 1 : 0}</span> - <span className="text-primary">{Math.min(itemsPerPage === Infinity ? filteredAndSortedData.length : currentPage * itemsPerPage, filteredAndSortedData.length)}</span> / <span className="text-primary">{filteredAndSortedData.length}</span>
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 hover:bg-white border-2 border-transparent hover:border-primary rounded transition-all text-primary active:scale-90 disabled:opacity-20">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-7 h-7 flex items-center justify-center rounded border-2 font-black text-[0.5625rem] transition-all active:scale-90 ${currentPage === pageNum ? 'bg-primary text-white border-primary shadow-hard-sm' : 'bg-white border-transparent hover:border-primary text-primary/60 hover:text-primary'}`}>{pageNum}</button>
                );
              })}
            </div>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 hover:bg-white border-2 border-transparent hover:border-primary rounded transition-all text-primary active:scale-90 disabled:opacity-20">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed z-[100] bg-white/90 backdrop-blur-md shadow-hard py-1 min-w-[180px] rounded border-2 border-primary overflow-hidden animate-in fade-in zoom-in slide-in-from-top-2 duration-150"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[0.5625rem] font-black uppercase tracking-widest text-primary/40 mb-1 border-b border-primary/10">
            Thao tác nhanh
          </div>
          
          {contextMenu.r !== -1 && (
            <>
              <button 
                onClick={() => { 
                  const row = filteredAndSortedData[contextMenu.r];
                  const col = visibleColumns[contextMenu.c];
                  const val = formatValue(row[col.key], col.type);
                  navigator.clipboard.writeText(val);
                  toast.success('Đã sao chép nội dung ô');
                  closeContextMenu(); 
                }} 
                className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
              >
                <Copy className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
                <span>Sao chép giá trị ô</span>
              </button>
              
              <button 
                onClick={() => { 
                  if (onCellChange) {
                    onCellChange(contextMenu.r, visibleColumns[contextMenu.c].key, '');
                    toast.success('Đã xóa dữ liệu ô');
                  }
                  closeContextMenu(); 
                }} 
                className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group text-destructive hover:text-destructive"
              >
                <Eraser className="w-3.5 h-3.5 text-destructive/40 group-hover:text-destructive transition-colors" />
                <span>Xóa giá trị ô</span>
              </button>

              <button 
                onClick={() => { 
                  if (onDeleteRow) {
                    onDeleteRow(contextMenu.r);
                  } else {
                    toast.error('Tính năng xóa dòng không khả dụng cho bảng này');
                  }
                  closeContextMenu(); 
                }} 
                className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive/40 group-hover:text-destructive transition-colors" />
                <span>Xóa dòng này</span>
              </button>

              <button 
                onClick={() => { 
                  toast.info('Tính năng định dạng ô đang được phát triển');
                  closeContextMenu(); 
                }} 
                className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
              >
                <Type className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
                <span>Định dạng ô</span>
              </button>
              
              <DropdownMenuSeparator className="bg-primary/10 mx-1" />
            </>
          )}

          <button onClick={() => { copyColumn(contextMenu.c); closeContextMenu(); }} className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group">
            <Copy className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
            <span>Sao chép cột</span>
          </button>
          <button onClick={() => { copySelection(); closeContextMenu(); }} className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group">
            <Table2 className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
            <span>Sao chép vùng chọn</span>
          </button>
          {selectionRange && (
            <button 
              onClick={() => { 
                if (onDeleteSelection) {
                  onDeleteSelection(selectionRange);
                } else if (onCellChange) {
                  const { startR, endR, startC, endC } = selectionRange;
                  const minR = Math.min(startR, endR), maxR = Math.max(startR, endR);
                  const minC = Math.min(startC, endC), maxC = Math.max(startC, endC);
                  for (let i = minR; i <= maxR; i++) {
                    for (let j = minC; j <= maxC; j++) {
                      onCellChange(i, visibleColumns[j].key, '');
                    }
                  }
                  toast.success(`Đã xóa dữ liệu trong ${ (maxR - minR + 1) * (maxC - minC + 1) } ô`);
                }
                closeContextMenu(); 
              }} 
              className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive/40 group-hover:text-destructive transition-colors" />
              <span>Xóa vùng chọn</span>
            </button>
          )}
          <DropdownMenuSeparator className="bg-primary/10 mx-1" />
          <button onClick={() => { setSortConfig({ key: visibleColumns[contextMenu.c].key, direction: 'asc' }); closeContextMenu(); }} className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group">
            <ChevronUp className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
            <span>Sắp xếp A-Z</span>
          </button>
          <button onClick={() => { setSortConfig({ key: visibleColumns[contextMenu.c].key, direction: 'desc' }); closeContextMenu(); }} className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group">
            <ChevronDown className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
            <span>Sắp xếp Z-A</span>
          </button>
        </div>
      )}
    </>
  );
});
