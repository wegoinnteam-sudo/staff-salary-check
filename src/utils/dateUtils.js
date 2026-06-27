// ============================================================
// 🕐 한국시간(KST, UTC+9) 기준 날짜 유틸리티
// ============================================================

/**
 * 현재 한국시간(KST) Date 객체를 반환합니다.
 */
export const getKoreanNow = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 9 * 3600000); // UTC+9
};

/**
 * 현재 한국시간 기준 연도와 월을 반환합니다.
 * @returns {{ year: number, month: number }} month는 1-based (1~12)
 */
export const getCurrentKoreanMonth = () => {
  const kst = getKoreanNow();
  return { year: kst.getFullYear(), month: kst.getMonth() + 1 };
};

/**
 * gviz API의 날짜 값을 Date 객체로 파싱합니다.
 * 여러 형식을 순서대로 시도합니다.
 * @param {*} value - gviz 셀 값 (v 필드)
 * @param {string} formatted - gviz 셀 포맷된 값 (f 필드)
 * @returns {Date|null}
 */
export const parseGvizDate = (value, formatted) => {
  // 1) Google Sheets Date 타입: "Date(2026,5,1)" (월은 0-indexed)
  if (typeof value === 'string') {
    const m = value.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (m) {
      return new Date(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
    }
  }

  // 2) ISO 날짜 형식: "2026-06-01" 또는 "2026/06/01"
  const isoStr = formatted || (typeof value === 'string' ? value : '');
  const isoMatch = isoStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  // 3) 한국 날짜 형식: "6월 1일" 또는 "6/1"
  const krMatch = isoStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (krMatch) {
    const { year } = getCurrentKoreanMonth();
    return new Date(year, parseInt(krMatch[1]) - 1, parseInt(krMatch[2]));
  }

  // 4) 슬래시 형식: "6/1"
  const slashMatch = isoStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const { year } = getCurrentKoreanMonth();
    return new Date(year, parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
  }

  return null;
};

/**
 * 날짜가 현재 한국시간 기준 특정 연월에 속하는지 확인합니다.
 * @param {Date|null} date
 * @param {number} year
 * @param {number} month - 1-based
 * @returns {boolean}
 */
export const isInMonth = (date, year, month) => {
  if (!date) return true; // 날짜를 파싱할 수 없으면 포함 (단일 월 시트 가정)
  return date.getFullYear() === year && date.getMonth() + 1 === month;
};

/**
 * 날짜를 한국어 형식으로 포맷합니다.
 * @param {Date} date
 * @returns {string} 예: "6월 1일 (일)"
 */
export const formatKoreanDate = (date) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
};

/**
 * 연월을 한국어로 표시합니다.
 * @param {number} year
 * @param {number} month
 * @returns {string} 예: "2026년 6월"
 */
export const formatKoreanMonth = (year, month) => `${year}년 ${month}월`;
