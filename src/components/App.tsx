import React from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';
import Portfolio from './Portfolio/Portfolio';
import Icons from './Icons/Icons';
import Create from './Create/Create';
import Configure from './Configure/Configure';
import NotFound from './NotFound';
import { Explorer } from './Explorer/Explorer';

import { Layout } from 'antd';

const { Header, Footer, Sider, Content } = Layout;

function App() {
  return (
    <Layout style={{ backgroundColor: '#FBFBFD' }}>
      <Header
        style={{
          background: '#FBFBFD',
          fontSize: '24px',
          color: '#fff'
        }}>
        <div
          style={{
            display: 'inline',
            paddingRight: '4px',
            paddingTop: '32px'
          }}></div>
      </Header>
      <Content style={{ margin: '0 16px 48px 16px', backgroundColor: '#FBFBFD' }}>
        <div
          style={{
            padding: 24,
            minHeight: 360
          }}>
          <Switch>
            <Route path="/explorer">
              <Explorer />
            </Route>
            <Route path="/portfolio">
              <Portfolio />
            </Route>
            <Route path="/create">
              <Create />
            </Route>
            <Route path="/icons">
              <Icons />
            </Route>
            <Route path="/configure">
              <Configure />
            </Route>
            <Redirect exact from="/" to="/portfolio" />
            <Route component={NotFound} />
          </Switch>
        </div>
      </Content>
    </Layout>
  );
}

export default App;
