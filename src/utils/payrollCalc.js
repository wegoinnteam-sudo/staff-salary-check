// ============================================================
// 💰 급여 계산 로직
// 시급·주휴수당·공제 계산식은 이 파일의 상단 함수에서 수정하세요
// ============================================================

import {
  DEFAULT_HOURLY_WAGE,
  INSURANCE_THRESHOLD,
  INSURANCE_ITEM_KEYS,
} from '../config.js';

// ─────────────────────────────────────────────
// 🔧 수정 가능한 핵심 계산 함수 (나중에 쉽게 변경)
// ─────────────────────────────────────────────

/**
 * 주휴수당 시간을 계산합니다.
 * 공식: 총 근무시간 / 40 × 8
 * 주휴수당 방식이 변경되면 이 함수만 수정하세요.
 * @param {number} totalHours - 해당 월 총 근무시간
 * @returns {number} 주휴수당 시간
 */
export const calculateHolidayHours = (totalHours) => {
  return (totalHours / 40) * 8;
};

/**
 * 직원의 시급을 결정합니다.
 * 현재는 기본값 사용. 개인 시급 데이터가 생기면 이 함수를 수정하세요.
 * @param {object} employee - 직원 정보
 * @returns {number} 시급 (원)
 */
export const getHourlyWage = (employee) => {
  // TODO: employee 객체에 hourlyWage 필드가 추가되면 아래 주석 해제
  // if (employee.hourlyWage) return employee.hourlyWage;
  return DEFAULT_HOURLY_WAGE;
};

// ─────────────────────────────────────────────
// 공제액 계산
// ─────────────────────────────────────────────

/**
 * 4대보험 공제액을 계산합니다.
 *
 * ⚠️ 요율 시트 주의사항:
 * - 국민연금/건강보험은 시트에 총 요율(9%, 7.09%)이 저장됨 → 직원 부담분은 절반
 * - 장기요양은 건강보험료의 N%로 계산 (총급여 기준 아님)
 * - 고용보험은 시트 값 그대로 직원 부담
 *
 * 나중에 계산 방식을 바꾸려면 이 함수만 수정하세요.
 *
 * @param {number} grossPay - 세전 총급여 (주휴수당 포함)
 * @param {object} insuranceRates - 시트에서 읽어온 요율 맵 { '국민연금': 0.09, ... }
 * @param {boolean} isFullInsurance - true면 4대보험 전체, false면 고용보험만
 * @returns {object} 공제 내역
 */
export const calculateDeductions = (grossPay, insuranceRates, isFullInsurance) => {
  // 시트에 저장된 요율 (없으면 한국 2024년 기준 기본값 사용)
  const rawRates = {
    [INSURANCE_ITEM_KEYS.NATIONAL_PENSION]: 0.09,    // 총 9% → 직원 4.5%
    [INSURANCE_ITEM_KEYS.HEALTH_INSURANCE]: 0.0709,  // 총 7.09% → 직원 3.545%
    [INSURANCE_ITEM_KEYS.LONG_TERM_CARE]: 0.1295,    // 건강보험료의 12.95%
    [INSURANCE_ITEM_KEYS.EMPLOYMENT_INSURANCE]: 0.009,
    ...insuranceRates,
  };

  // 고용보험: 총급여 × 고용보험율 (직원 부담분 그대로)
  const empInsRate = rawRates[INSURANCE_ITEM_KEYS.EMPLOYMENT_INSURANCE] || 0.009;
  const employmentInsurance = Math.floor(grossPay * empInsRate);

  if (!isFullInsurance) {
    return {
      nationalPension: 0,
      healthInsurance: 0,
      longTermCare: 0,
      employmentInsurance,
      total: employmentInsurance,
    };
  }

  // 국민연금: 총요율 ÷ 2 (직원 부담분 절반)
  const npRate = rawRates[INSURANCE_ITEM_KEYS.NATIONAL_PENSION] || 0.09;
  const nationalPension = Math.floor(grossPay * (npRate / 2));

  // 건강보험: 총요율 ÷ 2 (직원 부담분 절반)
  const hiRate = rawRates[INSURANCE_ITEM_KEYS.HEALTH_INSURANCE] || 0.0709;
  const healthInsurance = Math.floor(grossPay * (hiRate / 2));

  // 장기요양: 건강보험료 × 장기요양 요율
  const ltcRate = rawRates[INSURANCE_ITEM_KEYS.LONG_TERM_CARE] || 0.1295;
  const longTermCare = Math.floor(healthInsurance * ltcRate);

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    total: nationalPension + healthInsurance + longTermCare + employmentInsurance,
  };
};

// ─────────────────────────────────────────────
// 급여명세서 계산 메인 함수
// ─────────────────────────────────────────────

/**
 * 단일 직원의 급여명세서를 계산합니다.
 * @param {object} employee - { id, name, dailyHours: [{ date, day, label, hours }] }
 * @param {object} insuranceRates - 요율 시트 데이터
 * @param {string[]} holidayEligibleNames - 주휴수당 대상 직원 이름 목록
 * @param {{ year: number, month: number }} targetMonth
 * @returns {object} 급여명세서 전체 데이터
 */
export const calculatePayslip = (employee, insuranceRates, holidayEligibleNames, targetMonth) => {
  const { id, name, dailyHours } = employee;

  // 총 근무시간 계산 (이번 달)
  const totalHours = dailyHours.reduce((sum, d) => sum + d.hours, 0);

  // 시급
  const hourlyWage = getHourlyWage(employee);

  // 기본급 = 총 근무시간 × 시급
  const basePay = Math.floor(totalHours * hourlyWage);

  // 주휴수당 계산
  const isHolidayEligible = holidayEligibleNames.some(
    (n) => n.trim() === name.trim()
  );
  const holidayHours = isHolidayEligible ? calculateHolidayHours(totalHours) : 0;
  const holidayPay = Math.floor(holidayHours * hourlyWage);

  // 세전 총급여 = 기본급 + 주휴수당
  const grossPay = basePay + holidayPay;

  // 4대보험 전체 공제 여부 판단
  const isFullInsurance =
    grossPay >= INSURANCE_THRESHOLD.MIN_SALARY ||
    totalHours >= INSURANCE_THRESHOLD.MIN_HOURS;

  // 공제액 계산
  const deductions = calculateDeductions(grossPay, insuranceRates, isFullInsurance);

  // 실수령액
  const netPay = grossPay - deductions.total;

  return {
    id,
    name,
    targetMonth,
    dailyHours,           // 날짜별 근무시간 배열
    totalHours,
    hourlyWage,
    basePay,
    isHolidayEligible,
    holidayHours,
    holidayPay,
    grossPay,
    isFullInsurance,
    deductions,
    netPay,
  };
};

/**
 * 모든 직원의 급여명세서를 계산합니다.
 * 이번 달 근무시간이 있는 직원만 포함합니다.
 */
export const calculateAllPayslips = (employees, insuranceRates, holidayEligibleNames, targetMonth) => {
  return employees
    .map((emp) => calculatePayslip(emp, insuranceRates, holidayEligibleNames, targetMonth))
    .filter((p) => p.totalHours > 0); // 근무시간이 있는 직원만
};

// ─────────────────────────────────────────────
// 숫자 포맷 유틸리티
// ─────────────────────────────────────────────

/**
 * 숫자를 원화 형식으로 포맷합니다.
 * @param {number} amount
 * @returns {string} 예: "1,234,567원"
 */
export const formatKRW = (amount) => {
  if (amount === 0) return '0원';
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
};

/**
 * 시간을 소수점 1자리로 포맷합니다.
 * @param {number} hours
 * @returns {string} 예: "8.5시간"
 */
export const formatHours = (hours) => {
  if (hours === 0) return '-';
  return `${parseFloat(hours.toFixed(1))}시간`;
};
