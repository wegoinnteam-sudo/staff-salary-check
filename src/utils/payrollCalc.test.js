import { expect, test } from 'vitest';
import { calculateDeductions, calculatePayslip } from './payrollCalc.js';

test('빈 요율과 명시적인 0%는 모든 보험 공제액이 0이다', () => {
  for (const rates of [undefined, {}, { 국민연금: 0, 건강보험: 0, 고용보험: 0, 장기요양: 0 }]) {
    expect(calculateDeductions(2000000, rates, true)).toEqual({ nationalPension: 0, healthInsurance: 0, employmentInsurance: 0, longTermCare: 0, total: 0 });
    expect(calculateDeductions(2000000, rates, false).total).toBe(0);
  }
});

test('입력 요율로 기존 직원 부담 계산 방식을 유지한다', () => {
  expect(calculateDeductions(2000000, { 국민연금: 0.09, 건강보험: 0.07, 고용보험: 0.01, 장기요양: 0.1 }, true))
    .toEqual({ nationalPension: 90000, healthInsurance: 70000, employmentInsurance: 20000, longTermCare: 7000, total: 187000 });
});

test('시트의 근무시간 변경을 반영하며 빈 근무시간은 0이다', () => {
  const month = { year: 2026, month: 10 };
  const employee = { name: '테스트 직원', id: 'test', dailyHours: [] };
  expect(calculatePayslip(employee, {}, [], month).grossPay).toBe(0);
  const updated = { ...employee, dailyHours: [{ label: '10/1', hours: 8 }] };
  const payslip = calculatePayslip(updated, {}, [], month);
  expect(payslip.totalHours).toBe(8);
  expect(payslip.deductions.total).toBe(0);
  expect(payslip.netPay).toBe(payslip.grossPay);
});
