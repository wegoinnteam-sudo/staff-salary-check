import { APP_API_URL, MASTER_PASSWORD } from '../config.js';
import { parseApiResponse } from './apiResponse.js';

export const isEmployeeAuthConfigured = () => Boolean(APP_API_URL.trim());

const parseResponse = parseApiResponse;

export const fetchEmployeeLoginIds = async () => {
  if (!isEmployeeAuthConfigured()) return [];
  const response = await fetch(`${APP_API_URL}?action=list&_=${Date.now()}`);
  const data = await parseResponse(response);
  return data.employees || [];
};

export const saveEmployeeLoginId = async ({ sourceRow, name, loginId }) => {
  if (!isEmployeeAuthConfigured()) throw new Error('LOGIN_API_NOT_CONFIGURED');
  const response = await fetch(APP_API_URL, {
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
  const records = (loginRecords || []).map((record) => ({
    sourceRow: Number(record.sourceRow),
    name: String(record.name || '').trim(),
    loginId: String(record.loginId || '').trim(),
  }));

  return (employees || []).map((employee) => ({
    ...employee,
    id: getLoginIdForEmployee(employee, records),
  }));
};

/**
 * 로그인 ID는 직원 이름을 기준으로 유지합니다.
 *
 * time sheet 중간에 행이 추가되면 sourceRow가 바뀌므로 행 번호만으로 ID를 연결하면
 * 다른 직원에게 ID가 붙을 수 있습니다. 같은 행이면서 이름까지 일치하는 경우만
 * 행 번호를 우선하고, 그 외에는 저장된 이름으로 기존 ID를 찾습니다.
 *
 * 같은 이름의 직원이 둘 이상이면 이동 후 자동 식별할 수 없으므로, 그 경우에는
 * 잘못된 ID를 보여 주는 대신 빈 값으로 두어 관리자 확인을 요구합니다.
 */
export const getLoginIdForEmployee = (employee, records) => {
  const name = String(employee.name || '').trim();
  const sourceRow = employee.rowIndex + 1;
  const sameRow = records.find(
    (record) => record.sourceRow === sourceRow && record.name === name
  );
  if (sameRow) return sameRow.loginId;

  const sameName = records.filter((record) => record.name === name);
  return sameName.length === 1 ? sameName[0].loginId : '';
};
