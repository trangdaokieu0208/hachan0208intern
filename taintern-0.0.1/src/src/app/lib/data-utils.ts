import * as XLSX from 'xlsx';

export function cleanText(str: any) { return str ? String(str).replace(/_/g, ' ') : ""; }

export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str.toUpperCase().trim();
}

export function findColumnMapping(fileHeaders: string[], targetHeaders: string[]): Record<string, number> {
  const colMap: Record<string, number> = {};
  
  targetHeaders.forEach(target => {
    const tUp = target.toUpperCase().trim();
    
    // 1. Exact match
    let idx = fileHeaders.findIndex(h => h.toUpperCase().trim() === tUp);
    
    // 2. Fuzzy match if not found
    if (idx === -1) {
      if (tUp === "FULL NAME") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("FULL NAME") || v.includes("HỌ VÀ TÊN") || v.includes("TÊN NHÂN VIÊN"); });
      } else if (tUp === "ID NUMBER") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("ID") || v.includes("MÃ NV") || v.includes("CMND"); });
      } else if (tUp === "TOTAL PAYMENT") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("TOTAL") || v.includes("TỔNG") || v.includes("THỰC NHẬN"); });
      } else if (tUp === "BANK ACCOUNT NUMBER") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("ACCOUNT") || v.includes("TÀI KHOẢN") || v.includes("STK"); });
      } else if (tUp === "BANK NAME") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("BANK NAME") || v.includes("NGÂN HÀNG"); });
      } else if (tUp === "CITAD CODE") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("CITAD"); });
      } else if (tUp === "TAX CODE") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("TAX") || v.includes("MST") || v.includes("MÃ SỐ THUẾ"); });
      } else if (tUp === "CONTRACT NO") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("CONTRACT") || v.includes("HỢP ĐỒNG"); });
      } else if (tUp === "FROM") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v === "FROM" || v === "TỪ" || v.includes("TỪ NGÀY") || v === "START DATE"; });
      } else if (tUp === "TO") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v === "TO" || v === "ĐẾN" || v.includes("ĐẾN NGÀY") || v === "END DATE"; });
      } else if (tUp === "NO") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v === "NO" || v === "STT"; });
      } else if (tUp === "SALARY SCALE") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("SCALE") || v.includes("MỨC LƯƠNG") || v.includes("RANK"); });
      } else if (tUp === "BUSINESS") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("BUSINESS") || v.includes("KHỐI") || v.includes("BUS"); });
      } else if (tUp === "L07") {
        idx = fileHeaders.findIndex(h => { const v = h.toUpperCase(); return v.includes("L07") || v.includes("CENTER") || v.includes("TRUNG TÂM"); });
      }
    }
    
    colMap[target] = idx;
  });
  
  return colMap;
}

export function parseMoneyToNumber(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  
  let str = String(val).trim();
  
  // Kiểm tra định dạng số (ví dụ: 1.234,56 vs 1,234.56)
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Dấu phẩy là dấu thập phân (định dạng VN)
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    // Dấu chấm là dấu thập phân (định dạng US) hoặc không có thập phân
    str = str.replace(/,/g, '');
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function formatVND(val: any): string {
  return formatMoneyVND(val);
}

export function formatMoneyVND(val: any): string {
  const num = parseMoneyToNumber(val);
  if (num === 0) return "0";
  return num.toLocaleString('vi-VN');
}

export function formatExcelDate(val: any): string {
  if (!val) return "";
  if (typeof val === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(val);
      return `${String(date.d).padStart(2, '0')}-${String(date.m).padStart(2, '0')}-${date.y}`;
    } catch (e) {
      return String(val);
    }
  }
  let str = String(val).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
  }
  return str;
}

export function isMoneyColumn(header: string): boolean {
  const h = String(header).toUpperCase();
  const excluded = ["PAYMENT DETAILS", "PAYMENT TYPE", "PAYMENT SERIAL NUMBER", "CHARGE TYPE", "DOCUMENT ID"];
  if (excluded.includes(h)) return false;
  return h.includes("CHARGE") || h.includes("PAYMENT") || h.includes("TOTAL") ||
         h.includes("LƯƠNG") || h.includes("CHÊNH LỆCH") || h.includes("TIỀN") ||
         h.includes("AMOUNT") || h.includes("FEE") || h.includes("THƯỞNG");
}

export function isDateColumn(header: string): boolean {
  const h = String(header).toUpperCase();
  return h === "FROM" || h === "TO" || h.includes("DATE") || h.includes("NGÀY") || h.includes("DOB") || h.includes("THÁNG");
}
