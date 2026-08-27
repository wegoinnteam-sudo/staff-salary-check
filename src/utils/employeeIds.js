const STORAGE_KEY = 'wegoinn.employeeIds.v1';

export const getEmployeeKey = (employee) =>
  `${employee.rowIndex}:${String(employee.name || '').trim()}`;

export const loadEmployeeIds = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

export const saveEmployeeIds = (employeeIds) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employeeIds));
};

export const applyManagedIds = (employees, employeeIds) =>
  (employees || []).map((employee) => ({
    ...employee,
    id: String(employeeIds[getEmployeeKey(employee)] || '').trim(),
  }));
