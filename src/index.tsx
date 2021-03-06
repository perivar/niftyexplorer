import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import reportWebVitals from './reportWebVitals';
import { WalletProvider } from './utils/context';
import { HashRouter as Router } from 'react-router-dom';

import './index.scss';

ReactDOM.render(
  <WalletProvider>
    <Router>
      <App />
    </Router>
  </WalletProvider>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
