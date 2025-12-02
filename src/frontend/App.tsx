import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@pages/HomePage';
import { SearchPage } from '@pages/SearchPage';
import { OnboardingPage } from '@pages/OnboardingPage';
import { Layout } from '@components/Layout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>
    </Routes>
  );
}

export default App;
