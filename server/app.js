import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { MASTER_PASSWORD } from '../src/config.js';

export function createApp({ dataDir, distDir = path.resolve('dist'), adminCode = process.env.ADMIN_CODE || MASTER_PASSWORD }) {
  const dataFile = path.join(dataDir, 'payroll.json');
  let writes = Promise.resolve();
  const read = async () => {
    try { return JSON.parse(await readFile(dataFile, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return { employees: [], settings: {} }; throw error; }
  };
  const update = (mutate) => {
    const job = writes.then(async () => {
      const data = await read();
      const result = mutate(data);
      await mkdir(dataDir, { recursive: true });
      await writeFile(`${dataFile}.tmp`, JSON.stringify(data), { mode: 0o600 });
      await rename(`${dataFile}.tmp`, dataFile);
      return result;
    });
    writes = job.catch(() => {});
    return job;
  };
  return http.createServer(async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api') {
        if (req.method === 'GET') {
          const data = await read();
          if (url.searchParams.get('action') === 'list') return json(200, { ok: true, employees: data.employees || [] });
          if (url.searchParams.get('action') === 'payrollSettings') return json(200, { ok: true, settings: data.settings || {} });
          return json(400, { ok: false, message: '지원하지 않는 요청입니다.' });
        }
        if (req.method !== 'POST') return json(405, { ok: false });
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 65536) return json(413, { ok: false, message: '요청이 너무 큽니다.' });
        }
        let input;
        try { input = JSON.parse(body); } catch { return json(400, { ok: false, message: '잘못된 요청입니다.' }); }
        if (input.adminCode !== adminCode) return json(403, { ok: false, message: '관리자 인증에 실패했습니다.' });
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
          await update((data) => { data.settings = settings; });
          return json(200, { ok: true, settings });
        }
        if (input.action === 'save') {
          const sourceRow = Number(input.sourceRow);
          const name = String(input.name || '').trim();
          const loginId = String(input.loginId || '').trim();
          if (!Number.isInteger(sourceRow) || sourceRow < 1 || !name) return json(400, { ok: false, message: '직원 정보가 올바르지 않습니다.' });
          const result = await update((data) => {
            const employees = data.employees || [];
            if (loginId && employees.some((employee) => employee.name !== name && employee.loginId === loginId)) {
              return { ok: false, message: '이미 다른 직원에게 사용 중인 ID입니다.' };
            }
            data.employees = employees.filter((employee) => employee.name !== name);
            if (loginId) data.employees.push({ sourceRow, name, loginId });
            return { ok: true };
          });
          return json(200, result);
        }
        return json(400, { ok: false, message: '지원하지 않는 요청입니다.' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(405, { ok: false });
      const requested = path.resolve(distDir, '.' + decodeURIComponent(url.pathname));
      if (!requested.startsWith(distDir + path.sep) && requested !== distDir) return json(403, { ok: false });
      let file = requested;
      let content;
      try { content = await readFile(file); }
      catch { file = path.join(distDir, 'index.html'); content = await readFile(file); }
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
      json(500, { ok: false, message: '앱 서버에서 데이터를 처리하지 못했습니다.' });
    }
  });
}
