import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

process.env.REACT_APP_ELECTRUMX_MAINNET = 'dummy';
process.env.REACT_APP_ELECTRUMX_TESTNET = 'dummy';

test('renders search text', () => {
  render(<App />);
  const linkElement = screen.getByText(/Search/i);
  expect(linkElement).toBeInTheDocument();
});
