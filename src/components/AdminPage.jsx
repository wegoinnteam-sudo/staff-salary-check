// ============================================================
// 🛠️ 관리자 대시보드
// 전체 직원 급여 현황 조회 + Excel 내보내기
// ============================================================

import { useState } from 'react';
import PayslipDetail from './PayslipDetail.jsx';
import { exportToExcel } from '../utils/excelExport.js';
import { formatKRW, formatHours } from '../utils/payrollCalc.js';
import { formatKoreanMonth } from '../utils/dateUtils.js';

const AdminPage = ({ payslips, targetMonth, onLogout, loading, error }) => {
  // 상세 보기 모달용 선택된 직원
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const monthLabel = formatKoreanMonth(targetMonth.year, targetMonth.month);

  // Excel 다운로드 처리
  const handleExport = async () => {
    if (!payslips?.length) return;
    setIsExporting(true);
    try {
      exportToExcel(payslips, targetMonth);
    } catch (e) {
      alert('Excel 파일 생성 중 오류가 발생했습니다: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="page-container">
      {/* 상단 헤더 */}
      <header className="page-header page-header--admin">
        <div className="page-header-inner">
          <div className="page-header-brand">
            <span className="brand-icon">🏠</span>
            <div>
              <span className="brand-name">Wegoinn Hostel</span>
              <span className="admin-badge">관리자</span>
            </div>
          </div>
          <div className="page-header-right">
            <span className="month-badge">{monthLabel}</span>
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
            <p>직원 데이터를 불러오는 중...</p>
          </div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <h3>데이터 불러오기 실패</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={onLogout}>
              다시 로그인
            </button>
          </div>
        )}

        {/* 데이터 로드 완료 */}
        {!loading && !error && (
          <>
            {/* 관리자 요약 배너 */}
            <div className="admin-summary-banner">
              <div className="admin-summary-item">
                <span className="admin-summary-num">{payslips?.length || 0}</span>
                <span className="admin-summary-label">이번 달 근무 직원</span>
              </div>
              <div className="admin-summary-item">
                <span className="admin-summary-num">
                  {formatKRW(
                    payslips?.reduce((s, p) => s + p.netPay, 0) || 0
                  )}
                </span>
                <span className="admin-summary-label">총 실수령액 합계</span>
              </div>
              <div className="admin-summary-item">
                <span className="admin-summary-num">
                  {formatHours(
                    payslips?.reduce((s, p) => s + p.totalHours, 0) || 0
                  )}
                </span>
                <span className="admin-summary-label">총 근무시간</span>
              </div>
            </div>

            {/* Excel 내보내기 버튼 */}
            <div className="admin-actions">
              <button
                className="btn btn-excel"
                onClick={handleExport}
                disabled={isExporting || !payslips?.length}
              >
                {isExporting ? (
                  <>
                    <span className="spinner-sm" /> 생성 중...
                  </>
                ) : (
                  <>
                    📥 Excel로 내보내기
                  </>
                )}
              </button>
              <span className="admin-actions-hint">
                {monthLabel} 급여명세서 전체 다운로드
              </span>
            </div>

            {/* 직원 없음 */}
            {(!payslips || payslips.length === 0) && (
              <div className="empty-card">
                <div className="empty-icon">📭</div>
                <h3>이번 달 근무 직원이 없습니다.</h3>
                <p>
                  {monthLabel} 근무 기록이 있는 직원이 없습니다.
                </p>
              </div>
            )}

            {/* 직원 카드 그리드 */}
            {payslips && payslips.length > 0 && (
              <div className="admin-grid">
                {payslips.map((p) => (
                  <EmployeeSummaryCard
                    key={p.id}
                    payslip={p}
                    onClick={() => setSelectedPayslip(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* 상세 급여명세서 모달 */}
      {selectedPayslip && (
        <Modal onClose={() => setSelectedPayslip(null)}>
          <PayslipDetail
            payslip={selectedPayslip}
            onClose={() => setSelectedPayslip(null)}
          />
        </Modal>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// 직원 요약 카드
// ─────────────────────────────────────────────

const EmployeeSummaryCard = ({ payslip, onClick }) => {
  const { id, name, totalHours, grossPay, deductions, netPay, isFullInsurance, isHolidayEligible } =
    payslip;

  return (
    <div className="emp-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      {/* 카드 헤더 */}
      <div className="emp-card-header">
        <div className="emp-avatar">{name.charAt(0)}</div>
        <div>
          <div className="emp-name">{name}</div>
          <div className="emp-id">ID: {id}</div>
        </div>
        <div className="emp-card-badges">
          {isHolidayEligible && <span className="badge badge--teal">주휴↑</span>}
          {isFullInsurance && <span className="badge badge--orange">4대보험</span>}
        </div>
      </div>

      {/* 급여 정보 */}
      <div className="emp-card-body">
        <div className="emp-stat">
          <span className="emp-stat-label">총 근무시간</span>
          <span className="emp-stat-value">{formatHours(totalHours)}</span>
        </div>
        <div className="emp-stat">
          <span className="emp-stat-label">세전 급여</span>
          <span className="emp-stat-value">{formatKRW(grossPay)}</span>
        </div>
        <div className="emp-stat">
          <span className="emp-stat-label">총 공제액</span>
          <span className="emp-stat-value text-danger">{formatKRW(deductions.total)}</span>
        </div>
        <div className="emp-stat emp-stat--highlight">
          <span className="emp-stat-label">실수령액</span>
          <span className="emp-stat-value">{formatKRW(netPay)}</span>
        </div>
      </div>

      <div className="emp-card-footer">
        <span>상세 보기 →</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// 모달
// ─────────────────────────────────────────────

const Modal = ({ children, onClose }) => {
  // 배경 클릭 시 닫기
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        {children}
      </div>
    </div>
  );
};

export default AdminPage;
