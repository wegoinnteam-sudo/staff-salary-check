// ============================================================
// 📥 Excel 내보내기 (SheetJS/xlsx 라이브러리 사용)
// 형식: 이름 | 1일~말일 근무시간 | 국민연금 | 고용보험 | 건강보험 | 장기요양 | 합계
// ============================================================

import * as XLSX from 'xlsx';
import { formatKoreanMonth } from './dateUtils.js';

/**
 * dailyHours 엔트리에서 일(day) 숫자를 추출합니다.
 * date 객체 → label → 숫자 순으로 시도합니다.
 */
const getDayNumber = (entry) => {
  if (entry.date instanceof Date && !isNaN(entry.date)) {
    return entry.date.getDate();
  }
  const label = String(entry.label || '').trim();

  // "M/D" 형식
  const slashMatch = label.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) return parseInt(slashMatch[2]);

  // "M/D/YYYY" 형식
  const usMatch = label.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) return parseInt(usMatch[2]);

  // "M월 D일" 형식
  const krMatch = label.match(/^(\d{1,2})월\s*(\d{1,2})일$/);
  if (krMatch) return parseInt(krMatch[2]);

  // "YYYY-MM-DD" 형식
  const isoMatch = label.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) return parseInt(isoMatch[3]);

  // 단순 숫자 (1~31)
  const num = parseInt(label);
  if (!isNaN(num) && num >= 1 && num <= 31) return num;

  return null;
};

/**
 * 모든 직원 급여명세서를 Excel 파일로 다운로드합니다.
 *
 * 컬럼 순서:
 *   이름 | 1일 | 2일 | ... | 말일 | 국민연금 | 고용보험 | 건강보험 | 장기요양 | 합계
 */
export const exportToExcel = (payslips, targetMonth) => {
  if (!payslips.length) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  // 해당 월의 말일 계산
  const lastDay = new Date(targetMonth.year, targetMonth.month, 0).getDate();
  const dayNums = Array.from({ length: lastDay }, (_, i) => i + 1);

  // ─── 헤더 행 ───────────────────────────────────────────────
  const header = [
    '이름',
    ...dayNums.map((d) => `${d}일`),
    '국민연금',
    '고용보험',
    '건강보험',
    '장기요양',
    '합계',
  ];

  // ─── 데이터 행 ─────────────────────────────────────────────
  const rows = payslips.map((p) => {
    // 직원별 일(day) → 근무시간 맵 생성
    const hoursMap = {};
    p.dailyHours.forEach((entry) => {
      const day = getDayNumber(entry);
      if (day !== null) hoursMap[day] = entry.hours;
    });

    // 1일 ~ 말일 순으로 근무시간 배열 (미근무일은 빈칸)
    const dayValues = dayNums.map((d) =>
      hoursMap[d] > 0 ? parseFloat(hoursMap[d].toFixed(1)) : ''
    );

    return [
      p.name,
      ...dayValues,
      Math.round(p.deductions.nationalPension),
      Math.round(p.deductions.employmentInsurance),
      Math.round(p.deductions.healthInsurance),
      Math.round(p.deductions.longTermCare),
      Math.round(p.netPay),
    ];
  });

  // ─── 시트 생성 ─────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // 열 너비 설정
  ws['!cols'] = [
    { wch: 12 },                            // 이름
    ...dayNums.map(() => ({ wch: 5 })),     // 날짜 열 (좁게)
    { wch: 12 },                            // 국민연금
    { wch: 12 },                            // 고용보험
    { wch: 12 },                            // 건강보험
    { wch: 12 },                            // 장기요양
    { wch: 14 },                            // 합계
  ];

  // 헤더 행 스타일
  for (let c = 0; c < header.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[ref]) {
      ws[ref].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }

  // ─── 워크북 & 다운로드 ────────────────────────────────────
  const wb = XLSX.utils.book_new();
  const sheetName = formatKoreanMonth(targetMonth.year, targetMonth.month);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fileName = `Wegoinn_급여명세서_${targetMonth.year}년_${targetMonth.month}월.xlsx`;
  XLSX.writeFile(wb, fileName);
};
