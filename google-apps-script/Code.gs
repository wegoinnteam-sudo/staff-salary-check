// Wegoinn 직원 로그인 ID 관리 API
// 이 파일을 Google Sheet에 연결된 Apps Script 프로젝트에 붙여 넣으세요.

const SPREADSHEET_ID = '1a8jUbszQLpq-mzbfIV4oPgxrGxFCrFAnc4lhlzVzL-w';
const LOGIN_SHEET_NAME = '직원 로그인';
const ADMIN_CODE = '999222';

function doGet(e) {
  if ((e.parameter.action || '') !== 'list') return json_({ ok: false, message: '지원하지 않는 요청입니다.' });

  const sheet = getLoginSheet_();
  const values = sheet.getDataRange().getValues();
  const employees = values.slice(1)
    .filter((row) => row[0] !== '' && row[2] !== '')
    .map((row) => ({ sourceRow: Number(row[0]), name: String(row[1]), loginId: String(row[2]) }));
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
      const sheet = getLoginSheet_();
      const values = sheet.getDataRange().getValues();
      const rowIndex = values.findIndex((row, index) => index > 0 && Number(row[0]) === sourceRow);

      // 빈 ID로 저장하면 해당 직원의 로그인 ID를 제거합니다.
      if (!loginId) {
        if (rowIndex > 0) sheet.deleteRow(rowIndex + 1);
        return json_({ ok: true });
      }

      const duplicate = values.find((row, index) => index > 0 && Number(row[0]) !== sourceRow && String(row[2]).trim() === loginId);
      if (duplicate) return json_({ ok: false, message: '이미 다른 직원에게 사용 중인 ID입니다.' });

      if (rowIndex > 0) {
        sheet.getRange(rowIndex + 1, 1, 1, 3).setValues([[sourceRow, name, loginId]]);
      } else {
        sheet.appendRow([sourceRow, name, loginId]);
      }
      return json_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return json_({ ok: false, message: error.message || '저장 중 오류가 발생했습니다.' });
  }
}

function getLoginSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(LOGIN_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(LOGIN_SHEET_NAME);
    sheet.getRange(1, 1, 1, 3).setValues([['원본 행', '직원 이름', '로그인 ID']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
