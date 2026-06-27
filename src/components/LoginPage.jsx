// ============================================================
// 🔑 로그인 페이지
// 직원 ID 또는 마스터 비밀번호로 로그인
// ============================================================

import { useState } from 'react';
import { MASTER_PASSWORD } from '../config.js';

const LoginPage = ({ onLogin, employees, loading }) => {
  const [input, setValue] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = input.trim();
    if (!val) {
      setError('ID 또는 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // 마스터 비밀번호 확인
    if (val === MASTER_PASSWORD) {
      onLogin({ type: 'admin' });
      setIsSubmitting(false);
      return;
    }

    // 직원 ID 확인
    if (employees) {
      const found = employees.find((emp) => String(emp.id).trim() === val);
      if (found) {
        onLogin({ type: 'employee', employee: found });
        setIsSubmitting(false);
        return;
      }
      setError('등록되지 않은 ID입니다.');
    } else {
      setError('데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* 로고/브랜딩 */}
        <div className="login-header">
          <div className="login-logo">🏠</div>
          <h1 className="login-title">Wegoinn Hostel</h1>
          <p className="login-subtitle">급여명세서 조회 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">직원 ID 또는 관리자 코드</label>
            <input
              type="text"
              className="form-input"
              placeholder="ID를 입력하세요"
              value={input}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
              disabled={loading || isSubmitting}
              autoFocus
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="error-message">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* 로딩 상태 안내 */}
          {loading && (
            <div className="info-message">
              <span className="spinner-sm" /> 직원 데이터를 불러오는 중...
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || isSubmitting || !input.trim()}
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 안내 문구 */}
        <p className="login-hint">
          직원은 본인 ID 번호를, 관리자는 관리자 코드를 입력하세요.
        </p>
      </div>

      {/* 배경 장식 */}
      <div className="login-deco login-deco-1">✈️</div>
      <div className="login-deco login-deco-2">🌿</div>
      <div className="login-deco login-deco-3">⭐</div>
    </div>
  );
};

export default LoginPage;
