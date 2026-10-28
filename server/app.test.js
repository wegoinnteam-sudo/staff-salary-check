// @vitest-environment node
import { afterEach, beforeEach, expect, test } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from './app.js';

let server, dataDir, base;
beforeEach(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), 'payroll-test-'));
  server = createApp({ dataDir, adminCode: 'test-admin' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(dataDir, { recursive: true, force: true });
});
const get = async (action) => (await fetch(`${base}?action=${action}`)).json();
const post = async (body) => (await fetch(base, { method: 'POST', body: JSON.stringify({ adminCode: 'test-admin', ...body }) })).json();

test('공용 요율을 저장하고 서버를 다시 만들어도 유지한다', async () => {
  expect((await get('payrollSettings')).settings).toEqual({});
  expect((await post({ action: 'savePayrollSettings', settings: { insuranceRates: { 고용보험: 0.009 } } })).ok).toBe(true);
  await new Promise((resolve) => server.close(resolve));
  server = createApp({ dataDir, adminCode: 'test-admin' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  expect((await get('payrollSettings')).settings.insuranceRates).toEqual({ 고용보험: 0.009, 국민연금: 0, 건강보험: 0, 장기요양: 0 });
});

test('직원 ID를 저장하고 행 이동·중복·삭제를 처리한다', async () => {
  await post({ action: 'save', name: '테스트 직원', sourceRow: 5, loginId: '001234' });
  await post({ action: 'save', name: '테스트 직원', sourceRow: 6, loginId: '001234' });
  expect((await get('list')).employees).toEqual([{ name: '테스트 직원', sourceRow: 6, loginId: '001234' }]);
  expect((await post({ action: 'save', name: '다른 직원', sourceRow: 7, loginId: '001234' })).ok).toBe(false);
  await post({ action: 'save', name: '테스트 직원', sourceRow: 6, loginId: '' });
  expect((await get('list')).employees).toEqual([]);
});

test('관리자 인증 실패와 잘못된 요율은 저장하지 않는다', async () => {
  expect((await post({ action: 'savePayrollSettings', adminCode: 'wrong', settings: {} })).ok).toBe(false);
  expect((await post({ action: 'savePayrollSettings', settings: { insuranceRates: { 고용보험: -1 } } })).ok).toBe(false);
  expect((await get('payrollSettings')).settings).toEqual({});
});
