import React from 'react';
import { UserPlus, ClipboardList, BarChart3, Settings } from 'lucide-react';

export type TabType = 'novo' | 'atendimentos' | 'estatisticas' | 'configuracoes';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  todayCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  todayCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-2xl bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-40 shadow-lg select-none">
      {/* Tab: Novo Atendimento */}
      <button
        type="button"
        onClick={() => onTabChange('novo')}
        className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${
          currentTab === 'novo'
            ? 'text-teal-700 font-bold scale-105'
            : 'text-slate-400 font-medium hover:text-slate-600'
        }`}
      >
        <div className={`p-1 rounded-xl transition ${currentTab === 'novo' ? 'bg-teal-50' : ''}`}>
          <UserPlus className="w-5 h-5" />
        </div>
        <span className="text-[11px]">Novo</span>
      </button>

      {/* Tab: Atendimentos Registrados */}
      <button
        type="button"
        onClick={() => onTabChange('atendimentos')}
        className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 relative ${
          currentTab === 'atendimentos'
            ? 'text-teal-700 font-bold scale-105'
            : 'text-slate-400 font-medium hover:text-slate-600'
        }`}
      >
        <div className={`p-1 rounded-xl transition ${currentTab === 'atendimentos' ? 'bg-teal-50' : ''}`}>
          <ClipboardList className="w-5 h-5" />
        </div>
        <span className="text-[11px]">Atendimentos</span>
        {todayCount > 0 && (
          <span className="absolute top-0.5 right-4 bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
            {todayCount}
          </span>
        )}
      </button>

      {/* Tab: Estatísticas e BPA */}
      <button
        type="button"
        onClick={() => onTabChange('estatisticas')}
        className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${
          currentTab === 'estatisticas'
            ? 'text-teal-700 font-bold scale-105'
            : 'text-slate-400 font-medium hover:text-slate-600'
        }`}
      >
        <div className={`p-1 rounded-xl transition ${currentTab === 'estatisticas' ? 'bg-teal-50' : ''}`}>
          <BarChart3 className="w-5 h-5" />
        </div>
        <span className="text-[11px]">Produção</span>
      </button>

      {/* Tab: Sincronização & Configurações */}
      <button
        type="button"
        onClick={() => onTabChange('configuracoes')}
        className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${
          currentTab === 'configuracoes'
            ? 'text-teal-700 font-bold scale-105'
            : 'text-slate-400 font-medium hover:text-slate-600'
        }`}
      >
        <div className={`p-1 rounded-xl transition ${currentTab === 'configuracoes' ? 'bg-teal-50' : ''}`}>
          <Settings className="w-5 h-5" />
        </div>
        <span className="text-[11px]">Config / Nuvem</span>
      </button>
    </nav>
  );
};
