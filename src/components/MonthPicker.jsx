// 월 선택 드롭다운 컴포넌트
// 현재 월 기준으로 최근 12개월 + 다음 달까지 선택 가능

import { getCurrentKoreanMonth } from '../utils/dateUtils.js';

const MonthPicker = ({ targetMonth, onMonthChange }) => {
  const now = getCurrentKoreanMonth();

  // 선택 가능한 월 목록 생성: 12개월 전 ~ 다음 달
  const options = [];
  for (let i = -12; i <= 1; i++) {
    let m = now.month + i;
    let y = now.year;
    if (m <= 0) { m += 12; y -= 1; }
    if (m > 12) { m -= 12; y += 1; }
    options.push({ year: y, month: m });
  }
  // 최신 월이 맨 위로
  options.reverse();

  const value = `${targetMonth.year}-${String(targetMonth.month).padStart(2, '0')}`;

  const handleChange = (e) => {
    const [y, m] = e.target.value.split('-').map(Number);
    onMonthChange({ year: y, month: m });
  };

  return (
    <select
      className="month-picker"
      value={value}
      onChange={handleChange}
      aria-label="조회 월 선택"
    >
      {options.map(({ year, month }) => {
        const v = `${year}-${String(month).padStart(2, '0')}`;
        return (
          <option key={v} value={v}>
            {year}년 {month}월
          </option>
        );
      })}
    </select>
  );
};

export default MonthPicker;
