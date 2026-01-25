
import React from 'react';
import { UIProvider } from './state/UIContext';
import { AppProvider } from './state/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

const App: React.FC = () => {
  return (
    <UIProvider>
      <AppProvider>
        <Layout>
          <Home />
        </Layout>
      </AppProvider>
    </UIProvider>
  );
};

export default App;
