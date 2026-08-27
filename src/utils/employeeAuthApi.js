import { EMPLOYEE_AUTH_API_URL, MASTER_PASSWORD } from '../config.js';

export const isEmployeeAuthConfigured = () => Boolean(EMPLOYEE_AUTH_API_URL.trim());

const parseResponse = async (response) => {
  if (!response.ok) throw new Error('LOGIN_API_ERROR');
  const data = await response.json();
  if (!data.ok) throw new Error(data.message || 'LOGIN_API_ERROR');
  return data;
};

export const fetchEmployeeLoginIds = async () => {
  if (!isEmployeeAuthConfigured()) return [];
  const response = await fetch(`${EMPLOYEE_AUTH_API_URL}?action=list&_=${Date.now()}`);
  const data = await parseResponse(response);
  return data.employees || [];
};

export const saveEmployeeLoginId = async ({ sourceRow, name, loginId }) => {
  if (!isEmployeeAuthConfigured()) throw new Error('LOGIN_API_NOT_CONFIGURED');
  const response = await fetch(EMPLOYEE_AUTH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'save',
      adminCode: MASTER_PASSWORD,
      sourceRow,
      name,
      loginId: String(loginId || '').trim(),
    }),
  });
  return parseResponse(response);
};

export const attachLoginIds = (employees, loginRecords) => {
  const byRow = new Map(
    (loginRecords || []).map((record) => [Number(record.sourceRow), String(record.loginId || '').trim()])
  );
  return (employees || []).map((employee) => ({
    ...employee,
    id: byRow.get(employee.rowIndex + 1) || '',
  }));
};
