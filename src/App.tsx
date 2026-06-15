import { useState } from 'react';
import HomePage from './components/pages/HomePage';
import KhetNaap from './components/pages/khetNaap';
import FasalSuggestion from './components/pages/FasalSggestion';
import RogPehchaan from './components/pages/RogPehchaan';
import MandiDashboard from './components/pages/MandiDashboard';
import ChatBot from './components/ChatBot';
import BottomNav from './components/BottomNav';

export type Page = 'home' | 'khet' | 'mandi' | 'fasal' | 'rog' | 'chat';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage setPage={setCurrentPage} />;
      case 'khet': return <KhetNaap />;
      case 'mandi': return <MandiDashboard />;
      case 'fasal': return <FasalSuggestion />;
      case 'rog': return <RogPehchaan />;
      case 'chat': return <ChatBot />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 pb-24">
        {renderPage()}
      </div>
      <BottomNav currentPage={currentPage} setPage={setCurrentPage} />
    </div>
  );
}
