// ============================================================
// 🏠 Wegoinn Hostel 급여명세서 앱 - 메인 컴포넌트
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import LoginPage from './components/LoginPage.jsx';
import EmployeePage from './components/EmployeePage.jsx';
import AdminPage from './components/AdminPage.jsx';
import { fetchAllData } from './utils/sheetsApi.js';
import { calculatePayslip, calculateAllPayslips } from './utils/payrollCalc.js';
import { getCurrentKoreanMonth } from './utils/dateUtils.js';
import { applyManagedIds, getEmployeeKey, loadEmployeeIds, saveEmployeeIds } from './utils/employeeIds.js';
import './App.css';

function App() {
  // 한국시간 기준 현재 월 (로그인 시마다 갱신)
  const [targetMonth, setTargetMonth] = useState(() => getCurrentKoreanMonth());

  // 인증 상태: 'login' | 'employee' | 'admin'
  const [authState, setAuthState] = useState({ type: 'login' });

  // Google Sheets 원본 데이터 (employees, insuranceRates, holidayEligibleNames)
  const [sheetsData, setSheetsData] = useState(null);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [sheetsError, setSheetsError] = useState(null);
  const [employeeIds, setEmployeeIds] = useState(loadEmployeeIds);

  // 직원 이름/근무기록은 시트에서, 로그인 ID는 관리자 화면의 저장값에서 가져옵니다.
  const managedEmployees = useMemo(
    () => applyManagedIds(sheetsData?.employees, employeeIds),
    [sheetsData, employeeIds]
  );

  // 계산된 급여 데이터
  const [employeePayslip, setEmployeePayslip] = useState(null);
  const [allPayslips, setAllPayslips] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(null);

  // ─── targetMonth가 바뀔 때마다 Google Sheets 데이터 재fetch ─
  useEffect(() => {
    const load = async () => {
      setSheetsLoading(true);
      setSheetsError(null);
      setSheetsData(null); // 이전 달 데이터 초기화
      try {
        const data = await fetchAllData(targetMonth);
        setSheetsData(data);
      } catch (e) {
        setSheetsError(getErrorMessage(e.message));
      } finally {
        setSheetsLoading(false);
      }
    };
    load();
  }, [targetMonth]);

  // ─── 시트 데이터가 로드되면 급여 계산 (로그인 타이밍 무관) ─
  // 로그인 전에 데이터가 로드되거나, 데이터 로드 전에 로그인해도
  // 둘 다 준비되면 자동으로 계산됩니다.
  useEffect(() => {
    if (!sheetsData || authState.type === 'login') return;

    const compute = async () => {
      setCalcLoading(true);
      setCalcError(null);
      try {
        if (authState.type === 'admin') {
          // 관리자가 로그인 ID를 지정한 직원만 급여 현황에 포함
          const employeesWithId = managedEmployees.filter(
            (e) => String(e.id || '').trim() !== ''
          );
          const payslips = calculateAllPayslips(
            employeesWithId,
            sheetsData.insuranceRates,
            sheetsData.holidayEligibleNames,
            targetMonth
          );
          setAllPayslips(payslips);
        } else if (authState.type === 'employee' && authState.employee) {
          const empData = managedEmployees.find(
            (e) => String(e.id).trim() === String(authState.employee.id).trim()
          );
          if (!empData) {
            throw new Error('직원 데이터를 찾을 수 없습니다.');
          }
          const payslip = calculatePayslip(
            empData,
            sheetsData.insuranceRates,
            sheetsData.holidayEligibleNames,
            targetMonth
          );
          setEmployeePayslip(payslip);
        }
      } catch (e) {
        setCalcError('급여 계산 중 오류가 발생했습니다: ' + e.message);
      } finally {
        setCalcLoading(false);
      }
    };

    compute();
  // authState.type과 authState.employee.id가 바뀔 때, 또는 sheetsData가 처음 로드될 때 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetsData, managedEmployees, authState.type, authState.employee?.id, targetMonth]);

  const handleEmployeeIdSave = useCallback((employee, id) => {
    const normalizedId = String(id || '').trim();
    const key = getEmployeeKey(employee);
    const duplicate = managedEmployees.find(
      (item) => getEmployeeKey(item) !== key && String(item.id).trim() === normalizedId && normalizedId
    );
    if (duplicate) return { ok: false, message: `${duplicate.name} 직원이 이미 사용 중인 ID입니다.` };

    try {
      const next = { ...employeeIds };
      if (normalizedId) next[key] = normalizedId;
      else delete next[key];
      saveEmployeeIds(next);
      setEmployeeIds(next);
      return { ok: true };
    } catch {
      return { ok: false, message: '직원 ID를 저장하지 못했습니다.' };
    }
  }, [employeeIds, managedEmployees]);

  // ─── 로그인 처리 ──────────────────────────────────────────
  const handleLogin = useCallback(({ type, employee }) => {
    setCalcError(null);
    setEmployeePayslip(null);
    setAllPayslips(null);

    // 로그인 시점의 KST 현재 월로 갱신 (월이 바뀐 경우 자동 반영)
    setTargetMonth((prev) => {
      const now = getCurrentKoreanMonth();
      if (prev.year === now.year && prev.month === now.month) return prev;
      return now;
    });

    if (type === 'admin') {
      setAuthState({ type: 'admin' });
    } else if (type === 'employee') {
      setAuthState({ type: 'employee', employee });
    }
  }, []);

  // ─── 로그아웃 ─────────────────────────────────────────────
  const handleLogout = () => {
    setAuthState({ type: 'login' });
    setEmployeePayslip(null);
    setAllPayslips(null);
    setCalcError(null);
  };

  // ─── 월 변경 처리 ────────────────────────────────────────
  const handleMonthChange = useCallback((newMonth) => {
    setTargetMonth(newMonth);
    setEmployeePayslip(null);
    setAllPayslips(null);
    setCalcError(null);
  }, []);

  // ─── 화면 렌더링 ──────────────────────────────────────────
  switch (authState.type) {
    case 'employee':
      return (
        <EmployeePage
          payslip={employeePayslip}
          targetMonth={targetMonth}
          onMonthChange={handleMonthChange}
          onLogout={handleLogout}
          loading={sheetsLoading || calcLoading}
          error={sheetsError || calcError}
          employees={managedEmployees}
          onEmployeeIdSave={handleEmployeeIdSave}
        />
      );

    case 'admin':
      return (
        <AdminPage
          payslips={allPayslips}
          targetMonth={targetMonth}
          onMonthChange={handleMonthChange}
          onLogout={handleLogout}
          loading={sheetsLoading || calcLoading}
          error={sheetsError || calcError}
        />
      );

    default: // 'login'
      return (
        <LoginPage
          onLogin={handleLogin}
          employees={sheetsData ? managedEmployees : null}
          loading={sheetsLoading}
        />
      );
  }
}

// ─── 에러 메시지 한국어 변환 ──────────────────────────────────
const getErrorMessage = (code) => {
  if (code === 'NETWORK_ERROR')
    return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
  if (code === 'INVALID_RESPONSE')
    return '시트 데이터를 읽을 수 없습니다. Google Sheet를 "링크가 있는 모든 사용자가 볼 수 있음"으로 공개 설정해주세요.';
  if (code === 'PARSE_ERROR')
    return '데이터 형식 오류가 발생했습니다.';
  if (code?.includes('SHEETS_ERROR'))
    return '시트 접근 권한이 없습니다. "링크가 있는 사용자 모두 보기"로 공개 설정해주세요.';
  return `오류가 발생했습니다: ${code || '알 수 없는 오류'}`;
};

export default App;
