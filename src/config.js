// ============================================================
// ⚙️ 앱 설정값 - 주요 설정은 여기서 쉽게 변경할 수 있습니다
// ============================================================

// Google Sheets ID (URL에서 /d/ 와 /edit 사이의 값)
export const SHEET_IDS = {
  WORK_HOURS: '1a8jUbszQLpq-mzbfIV4oPgxrGxFCrFAnc4lhlzVzL-w',
  RATES: '1F9ZNVQw_mvQZ59j88Gwbruq_wCOnDLdfxBA0kK3KALM',
};

// 근무시간 시트의 탭(시트) 이름
// - 비워두면 첫 번째 탭을 사용
// - 실제 탭 이름(예: "6월근무", "June2026" 등)으로 설정하면 해당 탭을 읽음
// ⚠️ 현재 첫 번째 탭이 "Reception Notice"인 경우, 올바른 근무시간 탭 이름으로 변경 필요
export const WORK_HOURS_SHEET_NAME = 'time sheet';

// 관리자 마스터 비밀번호
export const MASTER_PASSWORD = '999222';

// 프리랜서(3.3% 원천징수) 직원 ID 목록
// 해당 직원은 4대보험 대신 소득세 3% + 지방소득세 0.3% = 3.3% 공제
export const FREELANCER_IDS = ['000905'];

// 프리랜서 → 4대보험 전환 시점
// 지정된 연/월부터는 FREELANCER_IDS에 있어도 다른 직원과 동일하게 4대보험 적용
// (해당 연/월 이전 데이터는 계속 3.3% 프리랜서로 계산됨)
export const FREELANCER_TO_INSURANCE_TRANSITIONS = {
  '000905': { year: 2026, month: 7 }, // 조혜민: 2026년 7월분부터 4대보험 전환
};

// 기본 시급 (단위: 원)
// TODO: 직원별 개인 시급 데이터 소스가 확정되면 시트에서 불러오도록 수정
export const DEFAULT_HOURLY_WAGE = 10320;

// 4대보험 전체 공제 적용 기준
export const INSURANCE_THRESHOLD = {
  MIN_SALARY: 800000, // 세전 급여 800,000원 이상
  MIN_HOURS: 80,      // 월 근무시간 80시간 이상
};

// Google Sheets 컬럼 인덱스 (0-based, gviz API 기준)
export const SHEET_CONFIG = {
  WORK_HOURS: {
    EMPLOYEE_ID_COL: 1,   // B열: 직원 ID
    EMPLOYEE_NAME_COL: 2, // C열: 직원 이름
    DATA_START_ROW: 4,    // 5행부터 직원 데이터 (0-indexed: 4)
    DAY_ROW: 0,           // 1행: 요일 (0-indexed: 0)
    DATE_ROW: 1,          // 2행: 날짜 (0-indexed: 1)
    DATE_COL_START: 3,    // D열부터 날짜별 근무시간 데이터 시작
  },
  RATES: {
    ITEM_NAME_COL: 0,         // A열: 공제 항목명
    RATE_COL: 1,              // B열: 요율 (소수점, 예: 0.045 = 4.5%)
    // 주휴수당 대상 직원 컬럼 (F열 기본, 필요시 3으로 변경 → D열)
    HOLIDAY_ELIGIBLE_COL: 5,  // F열: 주휴수당 지급 대상 직원
  },
};

// 4대보험 항목명 키워드 (시트 A열의 텍스트와 매칭)
export const INSURANCE_ITEM_KEYS = {
  NATIONAL_PENSION: '국민연금',
  HEALTH_INSURANCE: '건강보험',
  LONG_TERM_CARE: '장기요양',
  EMPLOYMENT_INSURANCE: '고용보험',
};

// 앱 표시 이름
export const APP_NAME = 'Wegoinn Hostel';
