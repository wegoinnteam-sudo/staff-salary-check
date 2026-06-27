// ============================================================
// 📊 Google Sheets 데이터 fetch & 파싱
// 참고: 시트는 "링크가 있는 모든 사용자가 볼 수 있음"으로 공개 설정 필요
// ============================================================

import { SHEET_IDS, SHEET_CONFIG, INSURANCE_ITEM_KEYS, WORK_HOURS_SHEET_NAME } from '../config.js';
import { parseGvizDate, isInMonth } from './dateUtils.js';

/**
 * gviz API URL을 생성합니다.
 * headers=0: 모든 행을 데이터 행으로 취급 (헤더 자동 처리 비활성화)
 * sheet: 탭 이름 (비어있으면 첫 번째 탭)
 */
const makeGvizUrl = (sheetId, sheetName = '') => {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&headers=0`;
  return sheetName ? `${base}&sheet=${encodeURIComponent(sheetName)}` : base;
};

/**
 * gviz API 응답 텍스트에서 JSON 테이블을 추출합니다.
 * 응답 형식: /*O_o* / google.visualization.Query.setResponse({...});
 */
const parseGvizResponse = (text) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('INVALID_RESPONSE');
  const json = JSON.parse(text.substring(start, end + 1));
  if (json.status === 'error') {
    throw new Error(`SHEETS_ERROR: ${json.errors?.[0]?.detailed_message || '접근 오류'}`);
  }
  return json.table;
};

/**
 * gviz 행의 특정 열 값을 안전하게 가져옵니다.
 * @returns {{ v: any, f: string }|null}
 */
const getCell = (row, colIndex) => {
  if (!row?.c || colIndex >= row.c.length) return null;
  return row.c[colIndex];
};

/**
 * 셀 값을 숫자로 변환합니다. 변환 실패 시 0 반환.
 */
const toNumber = (cell) => {
  if (!cell || cell.v === null || cell.v === undefined) return 0;
  const n = parseFloat(cell.v);
  return isNaN(n) ? 0 : n;
};

/**
 * 셀 값을 문자열로 변환합니다.
 */
const toString = (cell) => {
  if (!cell || cell.v === null || cell.v === undefined) return '';
  return String(cell.f || cell.v).trim();
};

// ─────────────────────────────────────────────
// 근무시간 시트 파싱
// ─────────────────────────────────────────────

/**
 * 근무시간 시트 전체를 fetch & 파싱합니다.
 * @param {{ year: number, month: number }} targetMonth - 조회 월 (한국시간 기준)
 * @returns {Promise<{ employees: Employee[], dateCols: DateCol[] }>}
 *
 * Employee: { id, name, rowIndex, dailyHours: [{ date, day, colIndex, hours }] }
 * DateCol:  { colIndex, date, day, label }
 */
export const fetchWorkHoursData = async (targetMonth) => {
  const url = makeGvizUrl(SHEET_IDS.WORK_HOURS, WORK_HOURS_SHEET_NAME);
  let text;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('NETWORK_ERROR');
    text = await res.text();
  } catch (e) {
    if (e.message === 'NETWORK_ERROR') throw e;
    throw new Error('NETWORK_ERROR');
  }

  const table = parseGvizResponse(text);
  const rows = table.rows || [];
  const cfg = SHEET_CONFIG.WORK_HOURS;

  // 날짜 행(2행)에서 날짜 컬럼 전체 파싱
  const dateRow = rows[cfg.DATE_ROW];
  const dayRow = rows[cfg.DAY_ROW];
  const allCols = [];

  for (let c = cfg.DATE_COL_START; c < (table.cols?.length || 0); c++) {
    const dateCell = getCell(dateRow, c);
    if (!dateCell) continue;

    const parsedDate = parseGvizDate(dateCell.v, dateCell.f);
    const dayCell = getCell(dayRow, c);
    const dayLabel = toString(dayCell);
    const label = parsedDate
      ? `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}`
      : toString(dateCell) || String(c);

    allCols.push({ colIndex: c, date: parsedDate, day: dayLabel, label });
  }

  // 날짜 파싱에 성공한 컬럼이 하나라도 있으면 현재 월만 필터링
  // 전혀 파싱되지 않으면 단일 월 시트로 간주하여 전체 포함
  const anyParsed = allCols.some((col) => col.date !== null);
  const dateCols = anyParsed
    ? allCols.filter((col) => col.date !== null && isInMonth(col.date, targetMonth.year, targetMonth.month))
    : allCols;

  // 직원 데이터 파싱 (5행부터)
  const employees = [];
  for (let r = cfg.DATA_START_ROW; r < rows.length; r++) {
    const row = rows[r];
    const idCell = getCell(row, cfg.EMPLOYEE_ID_COL);
    const nameCell = getCell(row, cfg.EMPLOYEE_NAME_COL);

    const id = toString(idCell);
    const name = toString(nameCell);
    if (!id && !name) continue; // 빈 행 스킵

    // 이번 달 날짜별 근무시간 추출
    const dailyHours = dateCols.map((dc) => {
      const cell = getCell(row, dc.colIndex);
      return {
        date: dc.date,
        day: dc.day,
        label: dc.label,
        colIndex: dc.colIndex,
        hours: toNumber(cell),
      };
    });

    employees.push({ id, name, rowIndex: r, dailyHours });
  }

  return { employees, dateCols };
};

// ─────────────────────────────────────────────
// 요율/주휴수당 시트 파싱
// ─────────────────────────────────────────────

/**
 * 요율 및 주휴수당 대상 시트를 fetch & 파싱합니다.
 * @returns {Promise<{ insuranceRates: object, holidayEligibleNames: string[] }>}
 *
 * insuranceRates: { '국민연금': 0.045, '건강보험': 0.03545, ... }
 * holidayEligibleNames: ['홍길동', '김철수', ...]
 */
export const fetchRatesData = async () => {
  const url = makeGvizUrl(SHEET_IDS.RATES);
  let text;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('NETWORK_ERROR');
    text = await res.text();
  } catch (e) {
    if (e.message === 'NETWORK_ERROR') throw e;
    throw new Error('NETWORK_ERROR');
  }

  const table = parseGvizResponse(text);
  const rows = table.rows || [];
  const cfg = SHEET_CONFIG.RATES;

  const insuranceRates = {};
  const holidayEligibleNames = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    // A열: 공제 항목명, B열: 요율
    const itemName = toString(getCell(row, cfg.ITEM_NAME_COL));
    const rateCell = getCell(row, cfg.RATE_COL);
    if (itemName && rateCell) {
      const rate = toNumber(rateCell);
      // 항목명에 키워드가 포함되어 있으면 저장
      for (const key of Object.values(INSURANCE_ITEM_KEYS)) {
        if (itemName.includes(key)) {
          insuranceRates[key] = rate;
          break;
        }
      }
    }

    // F열(또는 설정된 열): 주휴수당 대상 직원 이름
    const holidayCell = getCell(row, cfg.HOLIDAY_ELIGIBLE_COL);
    const holidayName = toString(holidayCell);
    if (holidayName) {
      holidayEligibleNames.push(holidayName);
    }
  }

  return { insuranceRates, holidayEligibleNames };
};

/**
 * 근무시간 시트와 요율 시트를 동시에 불러옵니다.
 */
export const fetchAllData = async (targetMonth) => {
  const [workData, ratesData] = await Promise.all([
    fetchWorkHoursData(targetMonth),
    fetchRatesData(),
  ]);
  return { ...workData, ...ratesData };
};
