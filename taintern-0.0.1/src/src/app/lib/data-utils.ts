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

export function findColumnMapping(fileHeaders: string[], targetHeaders: string[], manualMapping?: Record<string, string>): Record<string, number> {
  const colMap: Record<string, number> = {};
  
  targetHeaders.forEach(target => {
    // 1. Check manual mapping first
    if (manualMapping && manualMapping[target]) {
      const mappedHeader = manualMapping[target].toUpperCase().trim();
      const idx = fileHeaders.findIndex(h => h.toUpperCase().trim() === mappedHeader);
      if (idx !== -1) {
        colMap[target] = idx;
        return;
      }
    }

    const tUp = target.toUpperCase().trim();
    
    // 2. Exact match
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
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  
  let str = String(val).trim();
  if (!str) return 0;

  // Remove currency symbols and spaces
  str = str.replace(/[₫$€\s]/g, '');
  
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  
  // Logic to distinguish between VN (1.234.567,89) and US (1,234,567.89)
  // If there's a comma and it's near the end (decimal), or multiple dots (thousands)
  if (lastComma > lastDot) {
    // Likely VN format: 1.234,56
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Likely US format: 1,234.56
    // BUT wait: what if it's 1.000 (VN for one thousand)?
    // If there are multiple dots, it's definitely thousands separators
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      str = str.replace(/\./g, '');
    } else if (dotCount === 1) {
      // If it's exactly 3 digits after the dot, it's ambiguous but often thousands in VN
      const parts = str.split('.');
      if (parts[1].length === 3 && lastComma === -1) {
        // Ambiguous: 1.000 could be 1 or 1000. 
        // In this app's context (Vietnamese payroll), 1.000 is almost always 1,000.
        str = str.replace(/\./g, '');
      } else {
        str = str.replace(/,/g, '');
      }
    } else {
      str = str.replace(/,/g, '');
    }
  } else {
    // No dots or commas, or they are the same (shouldn't happen)
    str = str.replace(/[,.]/g, '');
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export const COMMON_FIELD_ALIASES: Record<string, string[]> = {
  "No": ["STT", "NO", "NUMBER", "SỐ THỨ TỰ"],
  "ID Number": ["ID", "MÃ NV", "CMND", "MÃ NHÂN VIÊN", "EMPLOYEE ID", "MÃ SỐ"],
  "Full name": ["NAME", "TÊN", "HỌ VÀ TÊN", "TÊN NHÂN VIÊN", "FULL NAME"],
  "Salary Scale": ["SCALE", "MỨC LƯƠNG", "RANK", "BẬC LƯƠNG", "SALARY RANK"],
  "From": ["FROM", "TỪ", "TỪ NGÀY", "START DATE", "NGÀY BẮT ĐẦU"],
  "To": ["TO", "ĐẾN", "ĐẾN NGÀY", "END DATE", "NGÀY KẾT THÚC"],
  "Bank Account Number": ["ACCOUNT", "TÀI KHOẢN", "STK", "SỐ TÀI KHOẢN", "BANK ACCOUNT"],
  "Bank Name": ["BANK NAME", "NGÂN HÀNG", "TÊN NGÂN HÀNG", "TEN NGAN HANG"],
  "CITAD code": ["CITAD", "MÃ CITAD", "CITAD CODE"],
  "TAX CODE": ["TAX", "MST", "MÃ SỐ THUẾ", "TAX CODE"],
  "Contract No": ["CONTRACT", "HỢP ĐỒNG", "SỐ HỢP ĐỒNG", "CONTRACT NO"],
  "CHARGE TO LXO": ["LXO", "CHARGE LXO", "CHARGE TO LXO"],
  "CHARGE TO EC": ["EC", "CHARGE EC", "CHARGE TO EC"],
  "CHARGE TO PT-DEMO": ["PT-DEMO", "CHARGE PT-DEMO", "CHARGE TO PT-DEMO"],
  "Charge MKT Local": ["MKT", "MKT LOCAL", "CHARGE MKT LOCAL"],
  "Charge Renewal Projects": ["RENEWAL", "RENEWAL PROJECTS", "CHARGE RENEWAL PROJECTS"],
  "Charge Discovery Camp": ["DISCOVERY", "DISCOVERY CAMP", "CHARGE DISCOVERY CAMP"],
  "Charge Summer Outing": ["SUMMER", "SUMMER OUTING", "CHARGE SUMMER OUTING"],
  "TOTAL PAYMENT": ["TOTAL", "TỔNG", "THỰC NHẬN", "TỔNG THANH TOÁN", "TOTAL PAYMENT", "NET PAY", "AMOUNT"],
  "Center": ["CENTER", "COST CENTER", "TRUNG TÂM", "AE CODE", "AE", "MÃ AE", "MÃ TT", "MÃ TRUNG TÂM"],
  "Business": ["BUSINESS", "KHỐI", "BUS", "BỘ PHẬN"]
};

export function formatVND(val: any): string {
  return formatMoneyVND(val);
}

export function formatMoneyVND(val: any): string {
  const num = parseMoneyToNumber(val);
  if (num === 0) return "0";
  // Vietnamese standard: 1.234.567
  return num.toLocaleString('de-DE').replace(/,/g, '.'); // Using de-DE as it uses . for thousands and , for decimal, then we can adjust if needed
}

export function formatNumber(val: any, type: 'string' | 'number' | 'money' | 'date' = 'number'): string {
  if (val === null || val === undefined) return "";
  
  switch (type) {
    case 'money':
      return formatMoneyVND(val);
    case 'number':
      const num = parseMoneyToNumber(val);
      // No thousands separator as requested by "không dùng dấu , . Ngăn cách phần nghìn"
      return String(num);
    case 'date':
      return formatExcelDate(val);
    default:
      return String(val);
  }
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
