import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

test('직원 ID 또는 관리자 코드 로그인 화면을 표시한다', () => {
  render(<App />);
  expect(screen.getByText('Wegoinn Hostel')).toBeDefined();
  expect(screen.getByText('직원 ID 또는 관리자 코드')).toBeDefined();
});
