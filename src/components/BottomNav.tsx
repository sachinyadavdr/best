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
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-1 rounded-3xl border border-gray-200 bg-white/95 px-2 py-2 shadow-xl backdrop-blur-xl">
        {navItems.map(({ id, label, Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200 ${active
                ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:bg-slate-100'
                }`}
              type="button"
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
