import { useEffect, useState } from 'react';
import { RATE_NAMES } from '../utils/payrollSettings.js';

export default function PayrollSettings({ settings, error, onSave }) {
  const [rates, setRates] = useState(() => Object.fromEntries(RATE_NAMES.map((name) => [name, Number(((settings.insuranceRates[name] || 0) * 100).toFixed(8)) || ''])));
  const [names, setNames] = useState(settings.holidayEligibleNames.join('\n'));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    setRates(Object.fromEntries(RATE_NAMES.map((name) => [name, Number(((settings.insuranceRates[name] || 0) * 100).toFixed(8)) || ''])));
    setNames(settings.holidayEligibleNames.join('\n'));
  }, [settings]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const insuranceRates = Object.fromEntries(RATE_NAMES.map((name) => {
        const rate = Number(rates[name] || 0);
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('요율은 0~100% 범위로 입력해주세요.');
        return [name, Number((rate / 100).toFixed(12))];
      }));
      await onSave({ insuranceRates, holidayEligibleNames: names.split(/[\n,]/).map((name) => name.trim()).filter(Boolean) });
      setMessage('저장했습니다. 직원 급여 계산에 적용됩니다.');
    } catch (error) {
      setMessage(error.message || '저장하지 못했습니다.');
    } finally { setSaving(false); }
  };

  return (
    <section className="employee-manager">
      <div className="employee-manager-heading">
        <h2>급여 요율 설정</h2>
        <p>빈칸은 0%로 적용합니다. 저장한 설정은 전체 직원과 조회 월에 공통 적용됩니다.</p>
        <p>국민연금·건강보험은 총 요율의 절반, 고용보험은 입력 요율 그대로 공제합니다. 장기요양은 건강보험료에 입력 요율을 곱합니다.</p>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <form onSubmit={submit}>
        {RATE_NAMES.map((name) => (
          <div className="form-group" key={name}>
            <label className="form-label" htmlFor={`rate-${name}`}>{name} 요율 (%)</label>
            <input id={`rate-${name}`} className="form-input" type="number" min="0" max="100" step="any" placeholder="0" value={rates[name]} disabled={saving}
              onChange={(event) => setRates((prev) => ({ ...prev, [name]: event.target.value }))} />
          </div>
        ))}
        <div className="form-group">
          <label className="form-label" htmlFor="holiday-names">주휴수당 대상 직원 이름</label>
          <textarea id="holiday-names" className="form-input" rows="4" value={names} disabled={saving} placeholder="한 줄에 한 명씩 입력하세요" onChange={(event) => setNames(event.target.value)} />
          <p>기존 요율 시트의 대상자 목록 대신 사용합니다. 미입력 시 주휴수당은 0원입니다.</p>
        </div>
        <button className="btn btn-primary" disabled={saving} type="submit">{saving ? '저장 중...' : '요율 저장'}</button>
        {message && <p role="status">{message}</p>}
      </form>
    </section>
  );
}
