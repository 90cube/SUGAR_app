import React from 'react';
import { AppProvider } from './state/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Layout>
        <Home />
      </Layout>
    </AppProvider>
  );
};

export default App;
