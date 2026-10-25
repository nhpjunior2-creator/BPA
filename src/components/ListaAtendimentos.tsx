import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Trash2,
  Calendar,
  Search,
  MapPin,
  Phone,
  CloudCheck,
  AlertTriangle,
  FolderOpen,
  Filter
} from 'lucide-react';
import { Atendimento, UserProfile } from '../types';
import { gerarPdfBpa, exportarCsvBpa, exportarJsonBackup } from '../services/pdfService';

interface ListaAtendimentosProps {
  atendimentos: Atendimento[];
  perfil: UserProfile | null;
  onExcluirAtendimento: (id: string) => Promise<void>;
  onLimparTodos: () => Promise<void>;
}

export const ListaAtendimentos: React.FC<ListaAtendimentosProps> = ({
  atendimentos,
  perfil,
  onExcluirAtendimento,
  onLimparTodos,
}) => {
  const [filtroData, setFiltroData] = useState<string>('');
  const [buscaTexto, setBuscaTexto] = useState<string>('');
  const [itemParaExcluir, setItemParaExcluir] = useState<Atendimento | null>(null);
  const [confirmarLimparGeral, setConfirmarLimparGeral] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Filtered List
  const atendimentosFiltrados = useMemo(() => {
    return atendimentos.filter((at) => {
      // Date filter
      if (filtroData) {
        const dataFiltroFormatada = new Date(filtroData + 'T00:00:00').toLocaleDateString('pt-BR');
        if (at.dataStr !== dataFiltroFormatada) {
          return false;
        }
      }

      // Text search
      if (buscaTexto.trim()) {
        const query = buscaTexto.toLowerCase().trim();
        const matchesNome = at.nome.toLowerCase().includes(query);
        const matchesDoc = at.documento.replace(/\D/g, '').includes(query.replace(/\D/g, ''));
        const matchesBairro = at.bairro.toLowerCase().includes(query);
        const matchesProc = at.procedimentos.some((p) => p.toLowerCase().includes(query));
        if (!matchesNome && !matchesDoc && !matchesBairro && !matchesProc) {
          return false;
        }
      }

      return true;
    });
  }, [atendimentos, filtroData, buscaTexto]);

  // Handle Export PDF
  const handleExportPdf = () => {
    if (atendimentosFiltrados.length === 0) {
      alert('Não há atendimentos para o filtro selecionado.');
      return;
    }
    const dataFiltroFormatada = filtroData
      ? new Date(filtroData + 'T00:00:00').toLocaleDateString('pt-BR')
      : undefined;
    gerarPdfBpa(atendimentosFiltrados, perfil, dataFiltroFormatada);
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    if (atendimentosFiltrados.length === 0) {
      alert('Não há registros para exportar.');
      return;
    }
    exportarCsvBpa(atendimentosFiltrados);
  };

  // Handle Delete Confirmation
  const executarExclusao = async () => {
    if (!itemParaExcluir) return;
    setIsDeleting(true);
    try {
      await onExcluirAtendimento(itemParaExcluir.id);
      setItemParaExcluir(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const executarLimpezaTotal = async () => {
    setIsDeleting(true);
    try {
      await onLimparTodos();
      setConfirmarLimparGeral(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-4">
      {/* Control & Filter Card */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-teal-800 uppercase tracking-wider">
              Atendimentos Registrados
            </h2>
            <span className="bg-teal-100 text-teal-800 font-bold text-xs px-2.5 py-0.5 rounded-full">
              {atendimentosFiltrados.length} de {atendimentos.length}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
            placeholder="Buscar por nome, SUS/CPF ou procedimento..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {buscaTexto && (
            <button
              onClick={() => setBuscaTexto('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Date Filters */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-teal-600" />
              <span>Filtrar por Data:</span>
            </label>
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700"
            />
          </div>
          <div className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={() => setFiltroData(new Date().toISOString().slice(0, 10))}
              className="flex-1 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-xs rounded-xl border border-teal-200 transition"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setFiltroData('')}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition"
            >
              Todos
            </button>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
          <button
            onClick={handleExportPdf}
            className="flex-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Gerar PDF (BPA)</span>
          </button>

          <button
            onClick={handleExportCsv}
            title="Exportar Tabela em Formato Excel/CSV"
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={() => exportarJsonBackup(atendimentos)}
            title="Exportar Backup JSON completo"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-2.5 rounded-xl font-semibold text-xs border border-slate-300 flex items-center gap-1 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          {atendimentos.length > 0 && (
            <button
              onClick={() => setConfirmarLimparGeral(true)}
              title="Apagar todos os atendimentos"
              className="bg-red-50 hover:bg-red-100 text-red-600 py-2 px-2.5 rounded-xl font-semibold text-xs border border-red-200 flex items-center justify-center transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Attendance Cards List */}
      <div className="space-y-3">
        {atendimentosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-2">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-700">Nenhum atendimento encontrado</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {buscaTexto || filtroData
                ? 'Tente alterar os termos da busca ou limpar o filtro de data.'
                : 'Utilize a aba "Novo" para cadastrar o primeiro atendimento de enfermagem.'}
            </p>
          </div>
        ) : (
          atendimentosFiltrados.map((atend) => (
            <div
              key={atend.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm space-y-2 hover:border-teal-300 transition"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{atend.nome}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-semibold text-teal-800">{atend.docType}:</span>{' '}
                    <span className="font-mono text-slate-700">{atend.documento}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] bg-slate-100 font-mono text-slate-700 px-2 py-0.5 rounded-lg font-medium block">
                    {atend.dataStr} • {atend.horaStr}
                  </span>
                </div>
              </div>

              {/* Patient Details */}
              <div className="text-xs text-slate-600 space-y-1">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {atend.logradouro}, nº {atend.numero} — {atend.bairro}, {atend.cidade}
                  </span>
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-[11px]">
                  <span>
                    <strong className="text-slate-600">Nascimento:</strong>{' '}
                    {atend.dataNasc.split('-').reverse().join('/')}
                  </span>
                  <span>
                    <strong className="text-slate-600">Raça:</strong> {atend.raca}
                  </span>
                  {atend.telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {atend.telefone}
                    </span>
                  )}
                </div>
              </div>

              {/* Clinical note if present */}
              {atend.observacoes && (
                <div className="bg-slate-50 p-2 rounded-xl text-[11px] text-slate-600 border border-slate-200/60">
                  <span className="font-semibold text-slate-700">Obs:</span> {atend.observacoes}
                </div>
              )}

              {/* Procedures Chips */}
              <div className="pt-1">
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Procedimentos:</p>
                <div className="flex flex-wrap gap-1">
                  {atend.procedimentos.map((p, idx) => (
                    <span
                      key={`${p}-${idx}`}
                      className="bg-teal-50 text-teal-900 text-[11px] font-medium px-2 py-0.5 rounded-lg border border-teal-200/70"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer: Sync indicator and Delete action */}
              <div className="pt-2 flex justify-between items-center border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Salvo no dispositivo & nuvem</span>
                </div>
                <button
                  type="button"
                  onClick={() => setItemParaExcluir(atend)}
                  className="text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 py-1 px-2 rounded hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal for Single Item Delete (Mandatory Zero-Data-Loss Safety) */}
      {itemParaExcluir && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Confirmar Exclusão</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja realmente excluir o atendimento de{' '}
              <strong className="text-slate-800 font-semibold">{itemParaExcluir.nome}</strong>?
              Esta ação removerá o registro do dispositivo e da sincronização.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarExclusao}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear All */}
      {confirmarLimparGeral && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Apagar Todos os Registros?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Você está prestes a apagar todos os <strong>{atendimentos.length}</strong> atendimentos
              registrados. Recomendamos exportar o relatório em PDF ou backup JSON antes de prosseguir.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmarLimparGeral(false)}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarLimpezaTotal}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
              >
                {isDeleting ? 'Apagando...' : 'Confirmar Limpeza'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
