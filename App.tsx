
import React from 'react';
import { AuthProvider } from './state/AuthContext';
import { UIProvider } from './state/UIContext';
import { AppProvider } from './state/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <UIProvider>
        <AppProvider>
          <Layout>
            <Home />
          </Layout>
        </AppProvider>
      </UIProvider>
    </AuthProvider>
  );
};

export default App;
