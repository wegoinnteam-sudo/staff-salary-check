// ============================================================
// 📥 Excel 내보내기 (SheetJS/xlsx 라이브러리 사용)
// 관리자 전용 기능
// ============================================================

import * as XLSX from 'xlsx';
import { formatKoreanMonth } from './dateUtils.js';

/**
 * 금액을 천단위 콤마 숫자로 반환합니다 (Excel 수치 형식용).
 */
const toNumber = (val) => Math.round(val || 0);

/**
 * 요일 헤더 배열을 생성합니다 (날짜 레이블 기반).
 */
const buildDateHeaders = (payslips) => {
  if (!payslips.length) return [];
  // 첫 번째 직원의 dailyHours에서 날짜 레이블 추출
  return payslips[0].dailyHours.map((d) => d.label);
};

// ─────────────────────────────────────────────
// 시트 1: 급여요약
// ─────────────────────────────────────────────

const buildSummarySheet = (payslips) => {
  const headers = [
    '직원ID',
    '직원이름',
    '조회월',
    '총근무시간',
    '시급(원)',
    '기본급(원)',
    '주휴수당대상',
    '주휴수당시간',
    '주휴수당(원)',
    '세전총급여(원)',
    '국민연금(원)',
    '건강보험(원)',
    '장기요양(원)',
    '고용보험(원)',
    '총공제액(원)',
    '실수령액(원)',
    '4대보험전체공제',
  ];

  const rows = payslips.map((p) => [
    p.id,
    p.name,
    formatKoreanMonth(p.targetMonth.year, p.targetMonth.month),
    parseFloat(p.totalHours.toFixed(2)),
    toNumber(p.hourlyWage),
    toNumber(p.basePay),
    p.isHolidayEligible ? '예' : '아니오',
    parseFloat(p.holidayHours.toFixed(2)),
    toNumber(p.holidayPay),
    toNumber(p.grossPay),
    toNumber(p.deductions.nationalPension),
    toNumber(p.deductions.healthInsurance),
    toNumber(p.deductions.longTermCare),
    toNumber(p.deductions.employmentInsurance),
    toNumber(p.deductions.total),
    toNumber(p.netPay),
    p.isFullInsurance ? '예' : '아니오',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 열 너비 설정
  ws['!cols'] = [
    { wch: 10 }, // 직원ID
    { wch: 12 }, // 직원이름
    { wch: 12 }, // 조회월
    { wch: 12 }, // 총근무시간
    { wch: 12 }, // 시급
    { wch: 14 }, // 기본급
    { wch: 12 }, // 주휴수당대상
    { wch: 12 }, // 주휴수당시간
    { wch: 14 }, // 주휴수당
    { wch: 16 }, // 세전총급여
    { wch: 14 }, // 국민연금
    { wch: 14 }, // 건강보험
    { wch: 14 }, // 장기요양
    { wch: 14 }, // 고용보험
    { wch: 14 }, // 총공제액
    { wch: 14 }, // 실수령액
    { wch: 16 }, // 4대보험전체
  ];

  // 헤더 행 스타일 (굵게 - xlsx community edition은 스타일 제한적)
  applyHeaderStyle(ws, headers.length);

  return ws;
};

// ─────────────────────────────────────────────
// 시트 2: 일별근무시간
// ─────────────────────────────────────────────

const buildDailyHoursSheet = (payslips) => {
  const dateLabels = buildDateHeaders(payslips);
  const headers = ['직원ID', '직원이름', ...dateLabels, '총근무시간'];

  const rows = payslips.map((p) => {
    const dailyValues = p.dailyHours.map((d) =>
      d.hours > 0 ? parseFloat(d.hours.toFixed(1)) : 0
    );
    return [p.id, p.name, ...dailyValues, parseFloat(p.totalHours.toFixed(2))];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 열 너비
  ws['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    ...dateLabels.map(() => ({ wch: 7 })),
    { wch: 12 },
  ];

  applyHeaderStyle(ws, headers.length);
  return ws;
};

// ─────────────────────────────────────────────
// 시트 3: 공제내역
// ─────────────────────────────────────────────

const buildDeductionSheet = (payslips) => {
  const headers = [
    '직원ID',
    '직원이름',
    '세전총급여(원)',
    '4대보험전체공제',
    '국민연금(원)',
    '건강보험(원)',
    '장기요양(원)',
    '고용보험(원)',
    '총공제액(원)',
    '실수령액(원)',
  ];

  const rows = payslips.map((p) => [
    p.id,
    p.name,
    toNumber(p.grossPay),
    p.isFullInsurance ? '예' : '아니오',
    toNumber(p.deductions.nationalPension),
    toNumber(p.deductions.healthInsurance),
    toNumber(p.deductions.longTermCare),
    toNumber(p.deductions.employmentInsurance),
    toNumber(p.deductions.total),
    toNumber(p.netPay),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  applyHeaderStyle(ws, headers.length);
  return ws;
};

// ─────────────────────────────────────────────
// 헤더 스타일 적용 (xlsx는 pro 기능이지만 기본 굵기는 적용)
// ─────────────────────────────────────────────

const applyHeaderStyle = (ws, colCount) => {
  for (let c = 0; c < colCount; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'E8604C' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }
};

// ─────────────────────────────────────────────
// 메인 export 함수
// ─────────────────────────────────────────────

/**
 * 모든 직원 급여명세서를 Excel 파일로 다운로드합니다.
 * @param {object[]} payslips - calculateAllPayslips()의 결과
 * @param {{ year: number, month: number }} targetMonth
 */
export const exportToExcel = (payslips, targetMonth) => {
  if (!payslips.length) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // 시트 1: 급여요약
  const summarySheet = buildSummarySheet(payslips);
  XLSX.utils.book_append_sheet(wb, summarySheet, '급여요약');

  // 시트 2: 일별근무시간
  const dailySheet = buildDailyHoursSheet(payslips);
  XLSX.utils.book_append_sheet(wb, dailySheet, '일별근무시간');

  // 시트 3: 공제내역
  const deductionSheet = buildDeductionSheet(payslips);
  XLSX.utils.book_append_sheet(wb, deductionSheet, '공제내역');

  // 파일명: Wegoinn_급여명세서_2026년_6월.xlsx
  const fileName = `Wegoinn_급여명세서_${targetMonth.year}년_${targetMonth.month}월.xlsx`;
  XLSX.writeFile(wb, fileName);
};
