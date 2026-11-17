import React from 'react';
import { Home, MessageCircle, PlusCircle, Store, User, Wrench } from 'lucide-react';
import { useI18n } from '../lib/i18nContext';

export type NavTab = 'home' | 'markets' | 'post' | 'chat' | 'services' | 'shop' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  unreadCount: number;
  onChangeTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  unreadCount,
  onChangeTab,
}) => {
  const { t } = useI18n();
  const items: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: t('nav_home'), icon: Home },
    { id: 'post', label: t('nav_post'), icon: PlusCircle },
    { id: 'chat', label: t('nav_chat'), icon: MessageCircle },
    { id: 'services', label: t('nav_services'), icon: Wrench },
    { id: 'shop', label: t('nav_shop'), icon: Store },
    { id: 'profile', label: t('nav_profile'), icon: User },
  ];

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-safe"
    >
      <div className="grid grid-cols-6 h-16 items-center">
        {items.map((item) => {
          const active = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`relative h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-green-800 font-bold' : 'text-slate-500 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${
                    item.id === 'post'
                      ? 'text-orange-500'
                      : item.id === 'services' && active
                      ? 'text-blue-600'
                      : ''
                  }`}
                />
                {item.id === 'chat' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-extrabold flex items-center justify-center tabular-nums border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-none tracking-tight">{item.label}</span>
              {active && <span className="mt-0.5 h-1 w-4 rounded-full bg-green-700" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
