import { MASTER_PASSWORD } from '../src/config.js';

export const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS employee_logins (name TEXT PRIMARY KEY, source_row INTEGER NOT NULL, login_id TEXT NOT NULL UNIQUE)',
  'CREATE TABLE IF NOT EXISTS payroll_settings (id INTEGER PRIMARY KEY CHECK (id = 1), value TEXT NOT NULL)',
];

const json = (status, data) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export async function onRequest({ request, env }) {
  if (!env.DB) return json(503, { ok: false, message: 'Cloudflare D1 저장소가 연결되지 않았습니다. Pages 설정에서 D1 바인딩 이름을 DB로 연결해주세요.' });
  try {
    const db = env.DB;
    await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
    if (request.method === 'GET') {
      const action = new URL(request.url).searchParams.get('action');
      if (action === 'list') {
        const { results } = await db.prepare('SELECT source_row AS sourceRow, name, login_id AS loginId FROM employee_logins ORDER BY source_row').all();
        return json(200, { ok: true, employees: results });
      }
      if (action === 'payrollSettings') {
        const row = await db.prepare('SELECT value FROM payroll_settings WHERE id = 1').first();
        return json(200, { ok: true, settings: row ? JSON.parse(row.value) : {} });
      }
      return json(400, { ok: false, message: '지원하지 않는 요청입니다.' });
    }
    if (request.method !== 'POST') return json(405, { ok: false });
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 65536) return json(413, { ok: false });
    let input;
    try { input = JSON.parse(body); } catch { return json(400, { ok: false, message: '잘못된 요청입니다.' }); }
    if (input.adminCode !== (env.ADMIN_CODE || MASTER_PASSWORD)) return json(403, { ok: false, message: '관리자 인증에 실패했습니다.' });
    if (input.action === 'savePayrollSettings') {
      const insuranceRates = {};
      for (const name of ['국민연금', '건강보험', '장기요양', '고용보험']) {
        const rate = Number(input.settings?.insuranceRates?.[name] ?? 0);
        if (!Number.isFinite(rate) || rate < 0 || rate > 1) return json(400, { ok: false, message: '요율은 0~100% 범위로 입력해주세요.' });
        insuranceRates[name] = rate;
      }
      const holidayEligibleNames = Array.isArray(input.settings?.holidayEligibleNames)
        ? input.settings.holidayEligibleNames.map(String).map((name) => name.trim()).filter(Boolean) : [];
      const settings = { insuranceRates, holidayEligibleNames };
      await db.prepare('INSERT INTO payroll_settings (id, value) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value').bind(JSON.stringify(settings)).run();
      return json(200, { ok: true, settings });
    }
    if (input.action === 'save') {
      const name = String(input.name || '').trim();
      const loginId = String(input.loginId || '').trim();
      const sourceRow = Number(input.sourceRow);
      if (!name || !Number.isInteger(sourceRow) || sourceRow < 1) return json(400, { ok: false, message: '직원 정보가 올바르지 않습니다.' });
      if (!loginId) {
        await db.prepare('DELETE FROM employee_logins WHERE name = ?').bind(name).run();
      } else {
        try {
          await db.prepare('INSERT INTO employee_logins (name, source_row, login_id) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET source_row = excluded.source_row, login_id = excluded.login_id').bind(name, sourceRow, loginId).run();
        } catch (error) {
          if (String(error.message).includes('UNIQUE')) return json(409, { ok: false, message: '이미 다른 직원에게 사용 중인 ID입니다.' });
          throw error;
        }
      }
      return json(200, { ok: true });
    }
    return json(400, { ok: false, message: '지원하지 않는 요청입니다.' });
  } catch {
    return json(500, { ok: false, message: 'Cloudflare 저장소 요청을 처리하지 못했습니다. D1 연결 상태를 확인해주세요.' });
  }
}
