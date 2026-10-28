export const API_CONNECTION_ERROR = '앱 서버에 연결되지 않았습니다. 직원 로그인과 설정 저장을 사용하려면 앱 서버 실행 및 /api 연결이 필요합니다.';

export const parseApiResponse = async (response) => {
  const body = await response.text();
  if (body.trimStart().startsWith('<')) throw new Error(API_CONNECTION_ERROR);
  let data;
  try { data = JSON.parse(body); }
  catch { throw new Error('앱 서버의 응답 형식이 올바르지 않습니다. /api 연결을 확인해주세요.'); }
  if (!response.ok || !data?.ok) throw new Error(data?.message || '앱 서버 요청을 처리하지 못했습니다.');
  return data;
};
