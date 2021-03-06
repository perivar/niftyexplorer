import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

process.env.REACT_APP_ELECTRUMX_MAINNET = 'dummy';
process.env.REACT_APP_ELECTRUMX_TESTNET = 'dummy';

test('renders Portfolio link', () => {
  render(<App />);
  const linkElement = screen.getByText(/Portfolio/i);
  expect(linkElement).toBeInTheDocument();
});
