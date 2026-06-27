// ============================================================
// 👤 직원 급여명세서 페이지
// 본인의 이번 달 급여명세서만 조회 가능
// ============================================================

import PayslipDetail from './PayslipDetail.jsx';
import { formatKoreanMonth } from '../utils/dateUtils.js';

const EmployeePage = ({ payslip, onLogout, loading, error }) => {
  const monthLabel = payslip
    ? formatKoreanMonth(payslip.targetMonth.year, payslip.targetMonth.month)
    : '';

  return (
    <div className="page-container">
      {/* 상단 헤더 */}
      <header className="page-header">
        <div className="page-header-inner">
          <div className="page-header-brand">
            <span className="brand-icon">🏠</span>
            <span className="brand-name">Wegoinn Hostel</span>
          </div>
          <div className="page-header-right">
            {monthLabel && (
              <span className="month-badge">{monthLabel}</span>
            )}
            <button className="btn btn-ghost" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="page-main">
        {/* 로딩 */}
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>급여 데이터를 불러오는 중...</p>
          </div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <h3>데이터 오류</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={onLogout}>
              다시 로그인
            </button>
          </div>
        )}

        {/* 근무 내역 없음 */}
        {!loading && !error && payslip && payslip.totalHours === 0 && (
          <div className="empty-card">
            <div className="empty-icon">📭</div>
            <h3>이번 달 근무 내역이 없습니다.</h3>
            <p>
              {formatKoreanMonth(payslip.targetMonth.year, payslip.targetMonth.month)} 근무
              기록이 확인되지 않습니다.
            </p>
            <button className="btn btn-ghost" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        )}

        {/* 급여명세서 */}
        {!loading && !error && payslip && payslip.totalHours > 0 && (
          <div className="payslip-wrapper">
            <div className="payslip-intro">
              <h2>
                안녕하세요, <strong>{payslip.name}</strong>님 👋
              </h2>
              <p>{monthLabel} 급여명세서입니다.</p>
            </div>
            <PayslipDetail payslip={payslip} />
          </div>
        )}
      </main>
    </div>
  );
};

export default EmployeePage;
