import { APP_API_URL, MASTER_PASSWORD, INSURANCE_ITEM_KEYS } from '../config.js';
import { parseApiResponse } from './apiResponse.js';

export const RATE_NAMES = Object.values(INSURANCE_ITEM_KEYS);
export const normalizePayrollSettings = (settings = {}) => ({
  insuranceRates: Object.fromEntries(RATE_NAMES.map((name) => {
    const value = Number(settings.insuranceRates?.[name] ?? 0);
    return [name, Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0];
  })),
  holidayEligibleNames: Array.isArray(settings.holidayEligibleNames)
    ? settings.holidayEligibleNames.map(String).map((name) => name.trim()).filter(Boolean) : [],
});

export const fetchPayrollSettings = async () => {
  const response = await fetch(`${APP_API_URL}?action=payrollSettings&_=${Date.now()}`);
  const data = await parseApiResponse(response);
  return normalizePayrollSettings(data.settings);
};

export const savePayrollSettings = async (settings) => {
  const response = await fetch(APP_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'savePayrollSettings', adminCode: MASTER_PASSWORD, settings: normalizePayrollSettings(settings) }),
  });
  const data = await parseApiResponse(response);
  return normalizePayrollSettings(data.settings);
};
