import { Home, Sprout, Bug, Map, TrendingUp, MessageCircle } from 'lucide-react';
import type { Page } from '../App';

interface Props {
  currentPage: Page;
  setPage: (page: Page) => void;
}

const navItems = [
  { id: 'home' as Page, label: 'होम', Icon: Home },
  { id: 'khet' as Page, label: 'खेत', Icon: Map },
  { id: 'mandi' as Page, label: 'मंडी', Icon: TrendingUp },
  { id: 'fasal' as Page, label: 'फसल', Icon: Sprout },
  { id: 'rog' as Page, label: 'रोग', Icon: Bug },
  { id: 'chat' as Page, label: 'चैट', Icon: MessageCircle },
];

export default function BottomNav({ currentPage, setPage }: Props) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t-2 border-green-100 z-50">
      <div className="flex justify-around items-center py-2">
        {navItems.map(({ id, label, Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${active
                ? 'text-green-700 bg-green-50'
                : 'text-gray-400'
                }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
