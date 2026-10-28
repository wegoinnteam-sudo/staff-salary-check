import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { fetchPayrollSettings, savePayrollSettings } from './utils/payrollSettings.js';
import { MASTER_PASSWORD } from './config.js';
import { fetchWorkHoursData } from './utils/sheetsApi.js';
import { fetchEmployeeLoginIds } from './utils/employeeAuthApi.js';

vi.mock('./utils/sheetsApi.js', () => ({ fetchWorkHoursData: vi.fn() }));
vi.mock('./utils/payrollSettings.js', async (importOriginal) => ({ ...await importOriginal(), fetchPayrollSettings: vi.fn(), savePayrollSettings: vi.fn() }));
vi.mock('./utils/employeeAuthApi.js', async (importOriginal) => ({
  ...await importOriginal(), fetchEmployeeLoginIds: vi.fn(),
}));

beforeEach(() => {
  fetchWorkHoursData.mockResolvedValue({ employees: [{ name: '테스트 직원', rowIndex: 4, dailyHours: [] }] });
  fetchPayrollSettings.mockResolvedValue({ insuranceRates: {}, holidayEligibleNames: [] });
  fetchEmployeeLoginIds.mockResolvedValue([{ name: '테스트 직원', sourceRow: 5, loginId: '001234' }]);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const login = (id) => {
  fireEvent.change(screen.getByPlaceholderText('ID를 입력하세요'), { target: { value: id } });
  fireEvent.click(screen.getByRole('button', { name: '로그인' }));
};

test('직원 ID 또는 관리자 코드 로그인 화면을 표시한다', () => {
  render(<App />);
  expect(screen.getByText('Wegoinn Hostel')).toBeDefined();
  expect(screen.getByText('직원 ID 또는 관리자 코드')).toBeDefined();
});

test('기존 요율 시트 없이 직원 로그인과 급여 조회를 허용한다', async () => {
  render(<App />);
  await waitFor(() => expect(screen.queryByText('직원 데이터를 불러오는 중...')).toBeNull());
  login('001234');
  expect((await screen.findAllByRole('button', { name: '로그아웃' })).length).toBeGreaterThan(0);
  expect(screen.queryByText('데이터 오류')).toBeNull();
  expect(await screen.findByText(/근무 내역이 없습니다/)).toBeDefined();
});

test('데이터 로딩 중에도 관리자 로그인을 허용한다', async () => {
  fetchWorkHoursData.mockReturnValue(new Promise(() => {}));
  render(<App />);
  login(MASTER_PASSWORD);
  expect(await screen.findByText('관리자')).toBeDefined();
});

test('직원 ID API 장애를 미등록 ID로 표시하지 않는다', async () => {
  fetchEmployeeLoginIds.mockRejectedValue(new Error('Failed to fetch'));
  render(<App />);
  await screen.findByText(/직원 ID를 불러오지 못했습니다/);
  login('001234');
  expect(screen.queryByText('등록되지 않은 ID입니다.')).toBeNull();
  expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull();
});


test('관리자가 요율을 퍼센트로 입력하고 공용 설정으로 저장한다', async () => {
  savePayrollSettings.mockImplementation(async (settings) => settings);
  render(<App />);
  await waitFor(() => expect(screen.queryByText('직원 데이터를 불러오는 중...')).toBeNull());
  login(MASTER_PASSWORD);
  fireEvent.click(await screen.findByRole('button', { name: '요율 설정' }));
  fireEvent.change(screen.getByLabelText('고용보험 요율 (%)'), { target: { value: '0.9' } });
  fireEvent.change(screen.getByLabelText('국민연금 요율 (%)'), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: '요율 저장' }));
  await waitFor(() => expect(savePayrollSettings).toHaveBeenCalledWith({ insuranceRates: { '국민연금': 0.09, '건강보험': 0, '장기요양': 0, '고용보험': 0.009 }, holidayEligibleNames: [] }));
});

test('설정 API 조회 실패 시에도 로그인을 허용한다', async () => {
  fetchPayrollSettings.mockRejectedValue(new Error('급여 설정을 불러오지 못했습니다.'));
  render(<App />);
  await waitFor(() => expect(screen.queryByText('직원 데이터를 불러오는 중...')).toBeNull());
  login('001234');
  expect((await screen.findAllByRole('button', { name: '로그아웃' })).length).toBeGreaterThan(0);
  expect(await screen.findByText(/근무 내역이 없습니다/)).toBeDefined();
});
