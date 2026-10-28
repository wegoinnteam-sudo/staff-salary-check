import { expect, test } from 'vitest';
import { parseApiResponse, API_CONNECTION_ERROR } from './apiResponse.js';

test('정적 호스팅에서 반환된 HTML을 서버 연결 오류로 알린다', async () => {
  await expect(parseApiResponse({ ok: true, text: async () => '<!DOCTYPE html><html></html>' })).rejects.toThrow(API_CONNECTION_ERROR);
});
test('정상 JSON과 서버 오류를 처리한다', async () => {
  await expect(parseApiResponse({ ok: true, text: async () => '{"ok":true,"settings":{}}' })).resolves.toEqual({ ok: true, settings: {} });
  await expect(parseApiResponse({ ok: false, text: async () => '{"ok":false,"message":"관리자 인증 실패"}' })).rejects.toThrow('관리자 인증 실패');
});
