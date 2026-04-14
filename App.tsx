
import React from 'react';
import { UIProvider } from './state/UIContext';
import { AppProvider } from './state/AppContext';
import { AudioProvider } from './state/AudioContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

const App: React.FC = () => {
  return (
    <UIProvider>
      <AppProvider>
        <AudioProvider>
          <Layout>
            <Home />
          </Layout>
        </AudioProvider>
      </AppProvider>
    </UIProvider>
  );
};

export default App;
