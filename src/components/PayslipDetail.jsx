// ============================================================
// 📋 급여명세서 상세 카드 (직원 / 관리자 공통 컴포넌트)
// ============================================================

import { useState } from 'react';
import { formatKRW, formatHours } from '../utils/payrollCalc.js';
import { formatKoreanMonth, parseGvizDate } from '../utils/dateUtils.js';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 엔트리의 요일 인덱스(0=일 ~ 6=토)를 반환합니다
const getDayOfWeek = (d) => {
  if (d.date instanceof Date && !isNaN(d.date)) return d.date.getDay();
  const parsed = parseGvizDate(d.label, d.label);
  if (parsed) return parsed.getDay();
  return null;
};

// dailyHours를 일요일 시작 7열 주간 그리드로 변환합니다
const buildWeeklyGrid = (dailyHours) => {
  if (!dailyHours.length) return [];
  const firstDow = getDayOfWeek(dailyHours[0]);

  if (firstDow !== null) {
    const slots = [...Array(firstDow).fill(null), ...dailyHours];
    while (slots.length % 7 !== 0) slots.push(null);
    const weeks = [];
    for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
    return weeks;
  }

  const weeks = [];
  for (let i = 0; i < dailyHours.length; i += 7) {
    const week = dailyHours.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
};

const PayslipDetail = ({ payslip, onClose }) => {
  const {
    id,
    name,
    targetMonth,
    dailyHours,
    totalHours,
    hourlyWage,
    basePay,
    isHolidayEligible,
    holidayHours,
    holidayPay,
    grossPay,
    isFreelancer,
    isFullInsurance,
    deductions,
    netPay,
  } = payslip;

  // 주휴수당 상세 계산 토글
  const [showHolidayDetail, setShowHolidayDetail] = useState(false);

  const workedDays = dailyHours.filter((d) => d.hours > 0);
  const weeklyGrid = buildWeeklyGrid(dailyHours);

  return (
    <div className="payslip">
      {/* 헤더 */}
      <div className="payslip-header">
        <div className="payslip-header-left">
          <div className="payslip-badge">급여명세서</div>
          <h2 className="payslip-name">{name}</h2>
          <p className="payslip-meta">
            ID: <strong>{id}</strong> &nbsp;·&nbsp;
            {formatKoreanMonth(targetMonth.year, targetMonth.month)}
            {isFreelancer && <span className="tag tag--freelancer">프리랜서</span>}
          </p>
        </div>
        {onClose && (
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        )}
      </div>

      {/* 실수령액 하이라이트 */}
      <div className="payslip-highlight">
        <span className="payslip-highlight-label">실수령액</span>
        <span className="payslip-highlight-amount">{formatKRW(netPay)}</span>
      </div>

      {/* 근무시간 요약 */}
      <Section title="⏱️ 근무시간">
        <Row label="총 근무시간" value={formatHours(totalHours)} bold />
        {workedDays.length === 0 && (
          <p className="empty-state-sm">이번 달 근무 내역이 없습니다.</p>
        )}
      </Section>

      {/* 날짜별 근무시간 - 주간 캘린더 */}
      {workedDays.length > 0 && (
        <Section title="📅 날짜별 근무시간">
          <div className="weekly-grid">
            {DAY_NAMES.map((d) => (
              <div key={d} className={`weekly-header-cell ${d === '일' ? 'weekly-header-cell--sun' : d === '토' ? 'weekly-header-cell--sat' : ''}`}>
                {d}
              </div>
            ))}
            {weeklyGrid.map((week, wi) =>
              week.map((entry, di) => {
                if (!entry) {
                  return <div key={`${wi}-${di}`} className="daily-cell daily-cell--placeholder" />;
                }
                const isSun = di === 0;
                const isSat = di === 6;
                return (
                  <div
                    key={`${wi}-${di}`}
                    className={[
                      'daily-cell',
                      entry.hours > 0 ? 'daily-cell--active' : 'daily-cell--empty',
                      isSun ? 'daily-cell--sun' : '',
                      isSat ? 'daily-cell--sat' : '',
                    ].join(' ').trim()}
                  >
                    <span className="daily-date">{entry.label}</span>
                    <span className="daily-hours">
                      {entry.hours > 0 ? `${entry.hours}h` : '-'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Section>
      )}

      {/* 급여 계산 내역 */}
      <Section title="💵 급여 계산">
        <Row label="시급" value={formatKRW(hourlyWage)} />
        <Row label={`기본급 (${formatHours(totalHours)})`} value={formatKRW(basePay)} />

        {isHolidayEligible ? (
          <>
            {/* 주휴수당 행 — 클릭하면 상세 계산 토글 */}
            <div
              className="payslip-row payslip-row--clickable"
              onClick={() => setShowHolidayDetail((v) => !v)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setShowHolidayDetail((v) => !v)}
            >
              <span className="payslip-row-label">
                주휴수당
                <span className="tag">주휴수당 대상</span>
                <span className="holiday-toggle-icon">{showHolidayDetail ? '▲' : '▼'}</span>
              </span>
              <span className="payslip-row-value">{formatKRW(holidayPay)}</span>
            </div>

            {/* 주휴 상세 계산 패널 */}
            {showHolidayDetail && (
              <div className="holiday-detail-panel">
                <p className="holiday-detail-title">주휴수당 계산 내역</p>
                <div className="holiday-detail-row">
                  <span>총 근무시간</span>
                  <span>{formatHours(totalHours)}</span>
                </div>
                <div className="holiday-detail-row">
                  <span>주휴 공식</span>
                  <span>총 근무시간 ÷ 40 × 8</span>
                </div>
                <div className="holiday-detail-row">
                  <span>주휴 시간</span>
                  <span>
                    {parseFloat(totalHours.toFixed(2))} ÷ 40 × 8 = <strong>{parseFloat(holidayHours.toFixed(2))}시간</strong>
                  </span>
                </div>
                <div className="holiday-detail-row">
                  <span>주휴수당</span>
                  <span>
                    {parseFloat(holidayHours.toFixed(2))}시간 × {formatKRW(hourlyWage)} = <strong>{formatKRW(holidayPay)}</strong>
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <Row label="주휴수당" value="해당 없음" muted />
        )}

        <div className="divider" />
        <Row label="세전 총급여" value={formatKRW(grossPay)} bold />
      </Section>

      {/* 공제 섹션 — 프리랜서 vs 4대보험 */}
      {isFreelancer ? (
        <Section title="🧾 원천징수 (프리랜서 3.3%)">
          <Row label="소득세 (3%)" value={formatKRW(Math.floor(grossPay * 0.03))} />
          <Row label="지방소득세 (0.3%)" value={formatKRW(Math.floor(grossPay * 0.003))} />
          <div className="divider" />
          <Row label="총 원천징수액" value={formatKRW(deductions.total)} bold danger />
        </Section>
      ) : (
        <Section
          title={`🔖 4대보험 공제 ${isFullInsurance ? '(전체)' : '(고용보험만)'}`}
        >
          {isFullInsurance ? (
            <>
              <Row label="국민연금" value={formatKRW(deductions.nationalPension)} />
              <Row label="건강보험" value={formatKRW(deductions.healthInsurance)} />
              <Row label="장기요양보험" value={formatKRW(deductions.longTermCare)} />
              <Row label="고용보험" value={formatKRW(deductions.employmentInsurance)} />
            </>
          ) : (
            <>
              <Row label="국민연금" value="미공제" muted />
              <Row label="건강보험" value="미공제" muted />
              <Row label="장기요양보험" value="미공제" muted />
              <Row label="고용보험" value={formatKRW(deductions.employmentInsurance)} />
            </>
          )}
          <div className="divider" />
          <Row label="총 공제액" value={formatKRW(deductions.total)} bold danger />
        </Section>
      )}

      {/* 최종 합계 */}
      <div className="payslip-total">
        <div className="payslip-total-row">
          <span>세전 총급여</span>
          <span>{formatKRW(grossPay)}</span>
        </div>
        <div className="payslip-total-row">
          <span>{isFreelancer ? '원천징수 (3.3%)' : '총 공제액'}</span>
          <span className="text-danger">- {formatKRW(deductions.total)}</span>
        </div>
        <div className="payslip-total-row payslip-total-row--final">
          <span>실수령액</span>
          <span>{formatKRW(netPay)}</span>
        </div>
      </div>

      {/* 안내 메시지 */}
      <p className="payslip-note">
        {isFreelancer
          ? '📋 프리랜서 신고 대상 · 세전 급여의 3.3% 원천징수 적용'
          : isFullInsurance
            ? '✅ 세전 급여 80만원 이상 또는 월 80시간 이상으로 4대보험 전체 적용'
            : 'ℹ️ 세전 급여 80만원 미만 · 월 80시간 미만으로 고용보험만 적용'}
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────
// 내부 서브 컴포넌트
// ─────────────────────────────────────────────

const Section = ({ title, children }) => (
  <div className="payslip-section">
    <h3 className="payslip-section-title">{title}</h3>
    <div className="payslip-section-body">{children}</div>
  </div>
);

const Row = ({ label, value, bold, muted, danger, tag }) => (
  <div className={`payslip-row ${bold ? 'payslip-row--bold' : ''}`}>
    <span className={`payslip-row-label ${muted ? 'text-muted' : ''}`}>
      {label}
      {tag && <span className="tag">{tag}</span>}
    </span>
    <span
      className={`payslip-row-value ${muted ? 'text-muted' : ''} ${danger ? 'text-danger' : ''} ${bold ? 'text-bold' : ''}`}
    >
      {value}
    </span>
  </div>
);

export default PayslipDetail;
