import { describe, expect, test } from 'vitest';
import { attachLoginIds } from './employeeAuthApi.js';

describe('attachLoginIds', () => {
  test('직원 행이 아래로 이동해도 이름을 기준으로 기존 로그인 ID를 유지한다', () => {
    const employees = [
      { name: '새 직원', rowIndex: 4, dailyHours: [] },
      { name: '김솔', rowIndex: 5, dailyHours: [] },
    ];
    const loginRecords = [
      { sourceRow: 5, name: '김솔', loginId: '001222' },
    ];

    expect(attachLoginIds(employees, loginRecords)).toEqual([
      { name: '새 직원', rowIndex: 4, dailyHours: [], id: '' },
      { name: '김솔', rowIndex: 5, dailyHours: [], id: '001222' },
    ]);
  });

  test('기존 행 번호에 다른 직원이 들어와도 ID를 잘못 부여하지 않는다', () => {
    const employees = [
      { name: '새 직원', rowIndex: 4, dailyHours: [] },
      { name: '김솔', rowIndex: 5, dailyHours: [] },
    ];
    const loginRecords = [
      { sourceRow: 5, name: '김솔', loginId: '001222' },
    ];

    const result = attachLoginIds(employees, loginRecords);
    expect(result[0].id).toBe('');
    expect(result[1].id).toBe('001222');
  });
});
