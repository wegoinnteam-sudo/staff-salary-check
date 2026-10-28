import { readFile, writeFile } from 'node:fs/promises';
import { SCHEMA } from '../functions/api.js';

const data = JSON.parse(await readFile('.data/payroll.json', 'utf8'));
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const rows = data.employees || [];
const statements = SCHEMA.map((sql) => sql + ';');
for (const row of rows) {
  if (!Number.isInteger(Number(row.sourceRow))) throw new Error('직원 행 정보가 올바르지 않습니다.');
  statements.push(`INSERT INTO employee_logins (name, source_row, login_id) VALUES (${quote(row.name)}, ${Number(row.sourceRow)}, ${quote(row.loginId)}) ON CONFLICT(name) DO NOTHING;`);
}
statements.push(`INSERT INTO payroll_settings (id, value) VALUES (1, ${quote(JSON.stringify(data.settings || {}))}) ON CONFLICT(id) DO NOTHING;`);
await writeFile('.data/cloudflare-import.sql', statements.join('\n') + '\n', { mode: 0o600 });
console.log(`D1 이전 파일 생성: .data/cloudflare-import.sql (직원 ${rows.length}명, Git 제외)`);
