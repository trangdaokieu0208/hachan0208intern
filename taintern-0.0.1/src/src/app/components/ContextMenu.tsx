import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, Trash2, AlignCenter, Palette, Type, Bold, Italic, Underline, AlertCircle } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: string) => void;
}

export function ContextMenu({ x, y, onClose, onAction }: ContextMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div className="fixed z-[10000] bg-white/90 backdrop-blur-md shadow-hard rounded-xl p-2 min-w-[180px]"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 p-2 hover:bg-secondary/30 rounded-lg cursor-pointer font-black uppercase text-[0.625rem] tracking-widest text-primary italic transition-all hover:translate-x-1" onClick={() => onAction('insertRowUp')}><ArrowUpToLine className="w-4 h-4" /> Chèn hàng trên</div>
        <div className="flex items-center gap-2 p-2 hover:bg-secondary/30 rounded-lg cursor-pointer font-black uppercase text-[0.625rem] tracking-widest text-primary italic transition-all hover:translate-x-1" onClick={() => onAction('insertRowDown')}><ArrowDownToLine className="w-4 h-4" /> Chèn hàng dưới</div>
        <div className="my-1"></div>
        <div className="flex items-center gap-2 p-2 hover:bg-rose-50 rounded-lg cursor-pointer font-black uppercase text-[0.625rem] tracking-widest text-rose-600 italic transition-all hover:translate-x-1" onClick={() => onAction('deleteRow')}><Trash2 className="w-4 h-4" /> Xoá hàng</div>
        <div className="my-1"></div>
        <div className="flex items-center gap-2 p-2 hover:bg-secondary/30 rounded-lg cursor-pointer font-black uppercase text-[0.625rem] tracking-widest text-primary italic transition-all hover:translate-x-1" onClick={() => onAction('centerAlign')}><AlignCenter className="w-4 h-4" /> Căn giữa</div>
      </div>
    </div>
  );
}
