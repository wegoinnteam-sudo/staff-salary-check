# Wegoinn 급여명세서

직원·근무시간은 Google Sheets의 `time sheet`에서 읽습니다. 로그인 ID, 보험 요율, 주휴수당 대상자는 앱 서버의 전용 저장소에 저장합니다. 실행 중 Google Apps Script를 호출하지 않습니다.

## Cloudflare Pages 운영 배포

`staff-salary-check.pages.dev`에서는 루트 `functions/api.js`가 `/api`를 처리하고 Cloudflare D1에 직원 ID와 설정을 보관합니다. 별도 Node 서버가 필요하지 않습니다.

1. Cloudflare 대시보드의 **Storage & databases → D1**에서 `staff-salary-check` 데이터베이스를 생성합니다.
2. **Workers & Pages → staff-salary-check → Settings → Bindings → Add → D1 database**에서 변수 이름을 **DB**로 지정하고 생성한 데이터베이스를 연결합니다. Production 환경에 적용합니다.
3. 기존 직원 ID 이전: `node server/export-d1.js`로 `.data/cloudflare-import.sql`을 생성하고, 해당 파일의 SQL을 D1 데이터베이스 Console에서 실행합니다. 이 파일에는 직원 ID가 있어 Git에 포함하지 않습니다. 현재 작업 환경에는 직원 11명의 이전 파일이 준비되어 있습니다. 기존 데이터가 있으면 덮어쓰지 않습니다.
4. Pages 빌드 명령은 `npm run build`, 출력 폴더는 `dist`, 루트 디렉터리는 저장소 루트로 설정합니다. Git 연동 배포로 루트 `functions/`도 함께 배포합니다. `dist`만 수동 업로드하는 배포로는 API가 포함되지 않습니다.
5. 바인딩 설정 후 Production 배포를 다시 실행합니다. `/api?action=payrollSettings`에서 HTML 대신 `{"ok":true,"settings":...}` JSON이 반환되는지 확인합니다.

D1 연결이나 직원 ID 이전이 끝나기 전에는 기존 직원의 운영 로그인이 복구되지 않습니다. 관리자 로그인은 데이터 조회 여부와 별개로 가능합니다. 요율을 비워두면 0%를 사용합니다.

공식 안내: https://developers.cloudflare.com/pages/functions/bindings/#d1-databases

## 실행

```sh
npm install
npm start
```

개발 화면은 3000번, API 서버는 3001번 포트를 사용합니다. 이전에 Vite만 실행했다면 종료 후 `npm start`로 다시 시작하세요.

운영 실행:

```sh
npm run build
npm run serve
```

Node.js 서버가 화면과 `/api`를 함께 제공합니다. 정적 파일만 배포하면 설정 저장·직원 로그인이 동작하지 않습니다.

## 데이터 저장

기본 저장 파일은 `.data/payroll.json`이며 Git에서 제외됩니다. 운영 환경에서는 `PAYROLL_DATA_DIR`을 영구 보관 경로로 지정하고 이 경로를 백업하세요. 기존 직원 ID를 유지하려면 이전한 `.data/payroll.json`도 운영 저장소에 복사해야 합니다. `PORT`로 운영 포트를 변경할 수 있습니다.

## 관리자 설정

관리자 로그인 → **요율 설정**에서 국민연금·건강보험·고용보험·장기요양 요율을 % 단위로 입력합니다. 빈 값과 0은 공제액 0으로 계산합니다. 국민연금·건강보험은 총 요율의 절반을 직원 부담으로, 고용보험은 입력 요율 그대로, 장기요양은 건강보험료에 요율을 곱해 계산합니다. 기존 프리랜서 원천징수 계산은 유지합니다.

주휴수당 대상 직원은 한 줄에 한 명씩 입력합니다. 빈 목록은 주휴수당 0원입니다. 저장한 설정은 모든 직원과 조회 월에 공통 적용됩니다. 직원 ID는 **직원 관리**에서 설정합니다.

관리자·직원 화면의 **시트 새로고침**, 월 변경, 페이지 새로고침으로 변경된 근무시간을 불러옵니다. 빈 근무시간은 0이며 근무 내역이 없는 달에는 0시간·0원을 표시합니다.

## 검증

```sh
npm test -- --run
npm run build
```

`google-apps-script/`는 이전 방식의 참고 자료이며 현재 앱에서는 사용하지 않습니다.
