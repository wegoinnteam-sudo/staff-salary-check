// Wegoinn 직원 로그인 ID 관리 API
// 로그인 ID는 Google Sheet가 아니라 Apps Script 내부 저장소에 보관됩니다.

const ADMIN_CODE = '999222';
const LOGIN_PROPERTY_KEY = 'employee_login_ids_v1';

function doGet(e) {
  if ((e.parameter.action || '') !== 'list') return json_({ ok: false, message: '지원하지 않는 요청입니다.' });

  const employees = Object.values(getLoginRecords_());
  return json_({ ok: true, employees });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action !== 'save' || body.adminCode !== ADMIN_CODE) {
      return json_({ ok: false, message: '관리자 인증에 실패했습니다.' });
    }

    const sourceRow = Number(body.sourceRow);
    const name = String(body.name || '').trim();
    const loginId = String(body.loginId || '').trim();
    if (!Number.isInteger(sourceRow) || sourceRow < 1 || !name) {
      return json_({ ok: false, message: '직원 정보가 올바르지 않습니다.' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const records = getLoginRecords_();

      // 이름은 유지되고 행 번호만 바뀐 경우(시트 중간에 직원 추가 등),
      // 기존 레코드를 새 행으로 옮깁니다. ID의 실제 식별자는 직원 이름입니다.
      const previousRowForName = Object.keys(records).find(
        (row) => Number(row) !== sourceRow && String(records[row].name || '').trim() === name
      );

      // 빈 ID로 저장하면 현재 행 또는 같은 이름의 기존 로그인 ID를 제거합니다.
      if (!loginId) {
        delete records[sourceRow];
        if (previousRowForName) delete records[previousRowForName];
        saveLoginRecords_(records);
        return json_({ ok: true });
      }

      if (previousRowForName) delete records[previousRowForName];

      const duplicate = Object.values(records).find(
        (record) => Number(record.sourceRow) !== sourceRow && String(record.loginId).trim() === loginId
      );
      if (duplicate) return json_({ ok: false, message: '이미 다른 직원에게 사용 중인 ID입니다.' });

      records[sourceRow] = { sourceRow, name, loginId };
      saveLoginRecords_(records);
      return json_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return json_({ ok: false, message: error.message || '저장 중 오류가 발생했습니다.' });
  }
}

function getLoginRecords_() {
  const value = PropertiesService.getScriptProperties().getProperty(LOGIN_PROPERTY_KEY);
  if (!value) return {};
  try {
    const records = JSON.parse(value);
    return records && typeof records === 'object' ? records : {};
  } catch (error) {
    return {};
  }
}

function saveLoginRecords_(records) {
  PropertiesService.getScriptProperties().setProperty(LOGIN_PROPERTY_KEY, JSON.stringify(records));
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
