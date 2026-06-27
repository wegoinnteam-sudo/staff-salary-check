// ============================================================
// 📋 급여명세서 상세 카드 (직원 / 관리자 공통 컴포넌트)
// ============================================================

import { formatKRW, formatHours } from '../utils/payrollCalc.js';
import { formatKoreanMonth, parseGvizDate } from '../utils/dateUtils.js';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// d.day가 없을 때 date 또는 label에서 요일을 계산합니다
const getDayName = (d) => {
  if (d.day) return d.day;
  if (d.date instanceof Date && !isNaN(d.date)) return DAY_NAMES[d.date.getDay()];
  // label에서 날짜 파싱 시도
  const parsed = parseGvizDate(d.label, d.label);
  if (parsed) return DAY_NAMES[parsed.getDay()];
  return '';
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
    isFullInsurance,
    deductions,
    netPay,
  } = payslip;

  // 근무한 날만 필터 (시간이 있는 날)
  const workedDays = dailyHours.filter((d) => d.hours > 0);

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

      {/* 날짜별 근무시간 */}
      {workedDays.length > 0 && (
        <Section title="📅 날짜별 근무시간">
          <div className="daily-hours-grid">
            {dailyHours.map((d, i) => (
              <div
                key={i}
                className={`daily-cell ${d.hours > 0 ? 'daily-cell--active' : 'daily-cell--empty'}`}
              >
                <span className="daily-date">{d.label}</span>
                <span className="daily-day">{getDayName(d)}</span>
                <span className="daily-hours">
                  {d.hours > 0 ? `${d.hours}h` : '-'}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 급여 계산 내역 */}
      <Section title="💵 급여 계산">
        <Row label="시급" value={formatKRW(hourlyWage)} />
        <Row label={`기본급 (${formatHours(totalHours)})`} value={formatKRW(basePay)} />

        {isHolidayEligible ? (
          <>
            <Row
              label={`주휴수당 시간 (${formatHours(holidayHours)})`}
              value={formatKRW(holidayPay)}
              tag="주휴수당 대상"
            />
          </>
        ) : (
          <Row label="주휴수당" value="해당 없음" muted />
        )}

        <div className="divider" />
        <Row label="세전 총급여" value={formatKRW(grossPay)} bold />
      </Section>

      {/* 4대보험 공제 */}
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

      {/* 최종 합계 */}
      <div className="payslip-total">
        <div className="payslip-total-row">
          <span>세전 총급여</span>
          <span>{formatKRW(grossPay)}</span>
        </div>
        <div className="payslip-total-row">
          <span>총 공제액</span>
          <span className="text-danger">- {formatKRW(deductions.total)}</span>
        </div>
        <div className="payslip-total-row payslip-total-row--final">
          <span>실수령액</span>
          <span>{formatKRW(netPay)}</span>
        </div>
      </div>

      {/* 공제 기준 안내 */}
      <p className="payslip-note">
        {isFullInsurance
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
