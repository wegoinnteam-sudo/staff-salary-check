// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { onRequest } from '../functions/api.js';

let sqlite, env;
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  const prepare = (sql, values = []) => ({
    bind: (...args) => prepare(sql, args),
    run: async () => sqlite.prepare(sql).run(...values),
    all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
    first: async () => sqlite.prepare(sql).get(...values),
  });
  env = { DB: { prepare, batch: (statements) => Promise.all(statements.map((statement) => statement.run())) }, ADMIN_CODE: 'test-admin' };
});
afterEach(() => sqlite.close());
const call = async (action, body) => {
  const request = new Request(`https://test.pages.dev/api?action=${action}`, body ? { method: 'POST', body: JSON.stringify({ adminCode: 'test-admin', action, ...body }) } : {});
  const response = await onRequest({ request, env });
  return { status: response.status, data: await response.json() };
};

test('D1 미연결 시 HTML 대신 설정 안내 JSON을 반환한다', async () => {
  const response = await onRequest({ request: new Request('https://test.pages.dev/api'), env: {} });
  expect(response.status).toBe(503);
  expect((await response.json()).message).toContain('D1');
});
test('Pages API에서 빈 요율과 저장한 요율을 읽는다', async () => {
  expect((await call('payrollSettings')).data.settings).toEqual({});
  expect((await call('savePayrollSettings', { settings: { insuranceRates: { 고용보험: 0.009 } } })).status).toBe(200);
  expect((await call('payrollSettings')).data.settings.insuranceRates).toEqual({ 국민연금: 0, 건강보험: 0, 장기요양: 0, 고용보험: 0.009 });
});
test('직원 ID의 선행 0 유지·행 이동·중복 방지·삭제를 처리한다', async () => {
  await call('save', { name: '직원 A', sourceRow: 5, loginId: '001234' });
  await call('save', { name: '직원 A', sourceRow: 6, loginId: '001234' });
  expect((await call('save', { name: '직원 B', sourceRow: 7, loginId: '001234' })).status).toBe(409);
  expect((await call('list')).data.employees).toEqual([{ name: '직원 A', sourceRow: 6, loginId: '001234' }]);
  await call('save', { name: '직원 A', sourceRow: 6, loginId: '' });
  expect((await call('list')).data.employees).toEqual([]);
});
test('인증 실패와 범위 밖 요율을 거절한다', async () => {
  expect((await call('savePayrollSettings', { adminCode: 'wrong', settings: {} })).status).toBe(403);
  expect((await call('savePayrollSettings', { settings: { insuranceRates: { 건강보험: 2 } } })).status).toBe(400);
});
