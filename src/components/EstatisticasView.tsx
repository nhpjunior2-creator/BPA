import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Syringe, Activity, Award } from 'lucide-react';
import { Atendimento } from '../types';

interface EstatisticasViewProps {
  atendimentos: Atendimento[];
}

export const EstatisticasView: React.FC<EstatisticasViewProps> = ({ atendimentos }) => {
  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let totalHoje = 0;
    let totalMes = 0;
    let totalProcedimentos = 0;

    const contagemProcedimentos: Record<string, number> = {};
    const contagemRaca: Record<string, number> = {};
    const faixasEtarias = {
      criancas: 0, // < 12
      adolescentes: 0, // 12 a 17
      adultos: 0, // 18 a 59
      idosos: 0, // 60+
    };

    const now = new Date();

    atendimentos.forEach((at) => {
      // Date analysis
      if (at.dataStr === todayStr) {
        totalHoje++;
      }

      if (at.dataHoraIso) {
        const d = new Date(at.dataHoraIso);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          totalMes++;
        }
      }

      // Procedures
      at.procedimentos.forEach((p) => {
        totalProcedimentos++;
        contagemProcedimentos[p] = (contagemProcedimentos[p] || 0) + 1;
      });

      // Race
      if (at.raca) {
        contagemRaca[at.raca] = (contagemRaca[at.raca] || 0) + 1;
      }

      // Age bracket
      if (at.dataNasc) {
        const b = new Date(at.dataNasc + 'T00:00:00');
        if (!isNaN(b.getTime())) {
          let age = now.getFullYear() - b.getFullYear();
          if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) {
            age--;
          }
          if (age < 12) faixasEtarias.criancas++;
          else if (age < 18) faixasEtarias.adolescentes++;
          else if (age < 60) faixasEtarias.adultos++;
          else faixasEtarias.idosos++;
        }
      }
    });

    const rankingProcedimentos = Object.entries(contagemProcedimentos)
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalGeral: atendimentos.length,
      totalHoje,
      totalMes,
      totalProcedimentos,
      rankingProcedimentos,
      contagemRaca,
      faixasEtarias,
    };
  }, [atendimentos]);

  return (
    <section className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Hoje</p>
            <h3 className="text-xl font-bold text-slate-800 leading-tight">{stats.totalHoje}</h3>
            <p className="text-[10px] text-teal-700 font-medium">Atendimentos</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Mês Atual</p>
            <h3 className="text-xl font-bold text-slate-800 leading-tight">{stats.totalMes}</h3>
            <p className="text-[10px] text-emerald-700 font-medium">BPA Mensal</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shrink-0">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Procedimentos</p>
            <h3 className="text-xl font-bold text-slate-800 leading-tight">{stats.totalProcedimentos}</h3>
            <p className="text-[10px] text-cyan-700 font-medium">Realizados</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Geral</p>
            <h3 className="text-xl font-bold text-slate-800 leading-tight">{stats.totalGeral}</h3>
            <p className="text-[10px] text-amber-700 font-medium">Pacientes</p>
          </div>
        </div>
      </div>

      {/* Top Procedures Ranking */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
          <Award className="w-4 h-4 text-teal-600" />
          <span>Procedimentos Mais Realizados</span>
        </h3>

        {stats.rankingProcedimentos.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">Nenhum procedimento registrado ainda.</p>
        ) : (
          <div className="space-y-2.5">
            {stats.rankingProcedimentos.map((proc, index) => {
              const percent = stats.totalProcedimentos > 0
                ? Math.round((proc.count / stats.totalProcedimentos) * 100)
                : 0;

              return (
                <div key={proc.nome} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 truncate max-w-[70%]">
                      {index + 1}. {proc.nome}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {proc.count} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Demographics: Age and Race Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Age Groups */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase">Faixa Etária (SUS)</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-600">Crianças (&lt; 12 anos)</span>
              <span className="font-bold text-teal-800 font-mono">{stats.faixasEtarias.criancas}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-600">Adolescentes (12 a 17)</span>
              <span className="font-bold text-teal-800 font-mono">{stats.faixasEtarias.adolescentes}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-600">Adultos (18 a 59)</span>
              <span className="font-bold text-teal-800 font-mono">{stats.faixasEtarias.adultos}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-600">Idosos (60+ anos)</span>
              <span className="font-bold text-teal-800 font-mono">{stats.faixasEtarias.idosos}</span>
            </div>
          </div>
        </div>

        {/* Race / Color */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase">Raça / Cor</h4>
          <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
            {Object.entries(stats.contagemRaca).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sem dados registrados.</p>
            ) : (
              Object.entries(stats.contagemRaca).map(([raca, qtd]) => (
                <div
                  key={raca}
                  className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100"
                >
                  <span className="text-slate-600">{raca}</span>
                  <span className="font-bold text-teal-800 font-mono">{qtd}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
