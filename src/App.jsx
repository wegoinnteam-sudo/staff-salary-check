// ============================================================
// 🏠 Wegoinn Hostel 급여명세서 앱 - 메인 컴포넌트
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import LoginPage from './components/LoginPage.jsx';
import EmployeePage from './components/EmployeePage.jsx';
import AdminPage from './components/AdminPage.jsx';
import { fetchWorkHoursData } from './utils/sheetsApi.js';
import { calculatePayslip, calculateAllPayslips } from './utils/payrollCalc.js';
import { getCurrentKoreanMonth } from './utils/dateUtils.js';
import { attachLoginIds, fetchEmployeeLoginIds, saveEmployeeLoginId } from './utils/employeeAuthApi.js';
import { fetchPayrollSettings, savePayrollSettings, normalizePayrollSettings } from './utils/payrollSettings.js';
import './App.css';

function App() {
  // 한국시간 기준 현재 월 (로그인 시마다 갱신)
  const [targetMonth, setTargetMonth] = useState(() => getCurrentKoreanMonth());

  // 인증 상태: 'login' | 'employee' | 'admin'
  const [authState, setAuthState] = useState({ type: 'login' });

  // Google Sheets 원본 데이터 (employees, insuranceRates, holidayEligibleNames)
  const [payrollSettings, setPayrollSettings] = useState(() => normalizePayrollSettings());
  const [settingsError, setSettingsError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [workData, setWorkData] = useState(null);
  const [employeeLoadError, setEmployeeLoadError] = useState(null);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [sheetsError, setSheetsError] = useState(null);
  const [loginRecords, setLoginRecords] = useState([]);
  const [loginApiError, setLoginApiError] = useState(null);

  const employees = useMemo(
    () => attachLoginIds(workData?.employees, loginRecords),
    [workData, loginRecords]
  );

  const sheetsData = useMemo(() => workData ? { ...workData, ...payrollSettings } : null, [workData, payrollSettings]);

  const handleSettingsSave = async (settings) => {
    const saved = await savePayrollSettings(settings);
    setPayrollSettings(saved);
    setSettingsError(null);
  };

  // 계산된 급여 데이터
  const [employeePayslip, setEmployeePayslip] = useState(null);
  const [allPayslips, setAllPayslips] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(null);

  // ─── targetMonth가 바뀔 때마다 Google Sheets 데이터 재fetch ─
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSheetsLoading(true);
      setSheetsError(null);
      setWorkData(null);
      setEmployeeLoadError(null);
      setLoginApiError(null);
      setLoginRecords([]);
      try {
        const [work, settings, auth] = await Promise.allSettled([
          fetchWorkHoursData(targetMonth),
          fetchPayrollSettings(),
          fetchEmployeeLoginIds(),
        ]);
        if (cancelled) return;
        if (work.status === 'fulfilled') setWorkData(work.value);
        else setEmployeeLoadError(getErrorMessage(work.reason.message));
        if (auth.status === 'fulfilled') setLoginRecords(auth.value);
        else setLoginApiError(`직원 ID를 불러오지 못했습니다. ${auth.reason.message || '앱 서버 연결을 확인해주세요.'}`);
        if (settings.status === 'fulfilled') {
          setPayrollSettings(settings.value);
          setSettingsError(null);
        } else {
          setPayrollSettings(normalizePayrollSettings());
          setSettingsError(`${settings.reason.message} 저장된 요율을 확인하지 못해 현재 0%로 표시합니다.`);
        }
        if (work.status === 'rejected') setSheetsError(getErrorMessage(work.reason.message));
      } catch (e) {
        if (!cancelled) setSheetsError(getErrorMessage(e.message));
      } finally {
        if (!cancelled) setSheetsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [targetMonth, refreshKey]);

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
          const payslips = calculateAllPayslips(
            employees,
            sheetsData.insuranceRates,
            sheetsData.holidayEligibleNames,
            targetMonth
          );
          setAllPayslips(payslips);
        } else if (authState.type === 'employee' && authState.employee) {
          const empData = employees.find(
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
  }, [sheetsData, employees, authState.type, authState.employee?.id, targetMonth]);

  const handleEmployeeLoginIdSave = useCallback(async (employee, loginId) => {
    const normalizedId = String(loginId || '').trim();
    const duplicate = employees.find(
      (item) => item.rowIndex !== employee.rowIndex && item.id === normalizedId && normalizedId
    );
    if (duplicate) throw new Error(`${duplicate.name} 직원이 이미 사용 중인 ID입니다.`);

    await saveEmployeeLoginId({
      sourceRow: employee.rowIndex + 1,
      name: employee.name,
      loginId: normalizedId,
    });
    const records = await fetchEmployeeLoginIds();
    setLoginRecords(records);
    setLoginApiError(null);
  }, [employees]);

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
          onRefresh={() => setRefreshKey((key) => key + 1)}
          payslip={employeePayslip}
          targetMonth={targetMonth}
          onMonthChange={handleMonthChange}
          onLogout={handleLogout}
          loading={sheetsLoading || calcLoading}
          error={sheetsError || calcError}
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
          employees={employees}
          loginApiError={loginApiError}
          onEmployeeLoginIdSave={handleEmployeeLoginIdSave}
          payrollSettings={payrollSettings}
          settingsError={settingsError}
          onSettingsSave={handleSettingsSave}
          onRefresh={() => setRefreshKey((key) => key + 1)}
        />
      );

    default: // 'login'
      return (
        <LoginPage
          onLogin={handleLogin}
          employees={workData ? employees : null}
          loading={sheetsLoading}
          dataError={employeeLoadError || loginApiError}
        />
      );
  }
}

// ─── 에러 메시지 한국어 변환 ──────────────────────────────────
const getErrorMessage = (code) => {
  if (code === 'SHEET_UNAVAILABLE')
    return '설정된 시트를 사용할 수 없습니다. 관리자에게 시트 주소와 삭제 여부 확인을 요청해주세요.';
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
