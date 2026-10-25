import React, { useState, useEffect } from 'react';
import {
  IdCard,
  User,
  Calendar,
  Phone,
  MapPin,
  Search,
  Plus,
  X,
  CheckCircle2,
  Syringe,
  Save,
  Loader2
} from 'lucide-react';
import { Atendimento } from '../types';
import { consultarCep } from '../services/cepService';

interface NovoAtendimentoProps {
  frequentProcedimentos: string[];
  onSalvarAtendimento: (atendimento: Omit<Atendimento, 'id' | 'userId' | 'dataTimestamp'>) => Promise<void>;
  onAdicionarProcedimentoFrequente: (procedimento: string) => void;
}

export const NovoAtendimento: React.FC<NovoAtendimentoProps> = ({
  frequentProcedimentos,
  onSalvarAtendimento,
  onAdicionarProcedimentoFrequente,
}) => {
  // Live Clock
  const [clock, setClock] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(
        `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Form State
  const [docType, setDocType] = useState<'SUS' | 'CPF'>('SUS');
  const [documento, setDocumento] = useState<string>('');
  const [nome, setNome] = useState<string>('');
  const [dataNasc, setDataNasc] = useState<string>('');
  const [idadeCalculada, setIdadeCalculada] = useState<string>('');
  const [raca, setRaca] = useState<string>('Parda');
  const [telefone, setTelefone] = useState<string>('');
  const [cep, setCep] = useState<string>('');
  const [logradouro, setLogradouro] = useState<string>('');
  const [numero, setNumero] = useState<string>('');
  const [semNumero, setSemNumero] = useState<boolean>(false);
  const [bairro, setBairro] = useState<string>('Centro');
  const [cidade, setCidade] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  // CEP loading
  const [isSearchingCep, setIsSearchingCep] = useState<boolean>(false);

  // Procedures State
  const [inputProc, setInputProc] = useState<string>('');
  const [procedimentosSelecionados, setProcedimentosSelecionados] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Calculate age when dataNasc changes
  useEffect(() => {
    if (!dataNasc) {
      setIdadeCalculada('');
      return;
    }
    const birth = new Date(dataNasc + 'T00:00:00');
    const now = new Date();
    if (isNaN(birth.getTime())) return;

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }

    if (years > 0) {
      setIdadeCalculada(`${years} ano${years > 1 ? 's' : ''}`);
    } else {
      setIdadeCalculada(`${months} ${months === 1 ? 'mês' : 'meses'}`);
    }
  }, [dataNasc]);

  // Handle Document Input Masking
  const handleDocChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (docType === 'SUS') {
      if (clean.length > 15) clean = clean.substring(0, 15);
      clean = clean.replace(/^(\d{3})(\d)/, '$1 $2');
      clean = clean.replace(/^(\d{3})\s(\d{4})(\d)/, '$1 $2 $3');
      clean = clean.replace(/^(\d{3})\s(\d{4})\s(\d{4})(\d)/, '$1 $2 $3 $4');
    } else {
      if (clean.length > 11) clean = clean.substring(0, 11);
      clean = clean.replace(/^(\d{3})(\d)/, '$1.$2');
      clean = clean.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
      clean = clean.replace(/\.(\d{3})(\d)/, '.$1-$2');
    }
    setDocumento(clean);
  };

  // Handle Phone Masking
  const handlePhoneChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.substring(0, 11);
    clean = clean.replace(/^(\d{2})(\d)/g, '($1) $2');
    clean = clean.replace(/(\d{5})(\d)/, '$1-$2');
    setTelefone(clean);
  };

  // Handle CEP Search
  const handleCepSearch = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const res = await consultarCep(cleanCep);
      if (res) {
        if (res.logradouro) setLogradouro(res.logradouro);
        if (res.bairro) setBairro(res.bairro);
        if (res.cidade) setCidade(res.cidade);
      }
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 8) clean = clean.substring(0, 8);
    clean = clean.replace(/^(\d{5})(\d)/, '$1-$2');
    setCep(clean);
  };

  // Procedure Handlers
  const handleAddProc = (nomeProc?: string) => {
    const p = (nomeProc || inputProc).trim();
    if (!p) return;
    if (!procedimentosSelecionados.includes(p)) {
      setProcedimentosSelecionados([...procedimentosSelecionados, p]);
    }
    onAdicionarProcedimentoFrequente(p);
    setInputProc('');
  };

  const handleRemoveProc = (index: number) => {
    setProcedimentosSelecionados(procedimentosSelecionados.filter((_, i) => i !== index));
  };

  // Save Attendance
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    const docDigits = documento.replace(/\D/g, '');
    if (docType === 'SUS' && docDigits.length !== 15) {
      setFeedbackMsg({
        type: 'error',
        text: 'O Cartão Nacional de Saúde (SUS) precisa ter exatamente 15 dígitos.',
      });
      return;
    }
    if (docType === 'CPF' && docDigits.length !== 11) {
      setFeedbackMsg({
        type: 'error',
        text: 'O CPF precisa ter exatamente 11 dígitos.',
      });
      return;
    }
    if (!nome.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o nome do paciente.' });
      return;
    }
    if (!dataNasc) {
      setFeedbackMsg({ type: 'error', text: 'Informe a data de nascimento.' });
      return;
    }
    if (!logradouro.trim() || !bairro.trim() || !cidade.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Preencha o endereço completo (Logradouro, Bairro e Cidade).' });
      return;
    }
    if (procedimentosSelecionados.length === 0) {
      setFeedbackMsg({
        type: 'error',
        text: 'Adicione pelo menos um procedimento realizado neste atendimento.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      await onSalvarAtendimento({
        docType,
        documento,
        nome: nome.trim(),
        dataNasc,
        raca,
        telefone: telefone.trim(),
        cep: cep.trim(),
        logradouro: logradouro.trim(),
        numero: semNumero ? 'S/N' : numero.trim() || 'S/N',
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        procedimentos: [...procedimentosSelecionados],
        observacoes: observacoes.trim(),
        dataStr: now.toLocaleDateString('pt-BR'),
        horaStr: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        dataHoraIso: now.toISOString(),
      });

      // Android haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      setFeedbackMsg({
        type: 'success',
        text: 'Atendimento registrado com sucesso e sincronizado!',
      });

      // Reset form fields
      setDocumento('');
      setNome('');
      setDataNasc('');
      setTelefone('');
      setCep('');
      setLogradouro('');
      setNumero('');
      setSemNumero(false);
      setBairro('Centro');
      setObservacoes('');
      setProcedimentosSelecionados([]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: `Erro ao salvar: ${errorMsg}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      {/* Alert Banner */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between shadow-sm animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Patient Data Card */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-teal-800 uppercase tracking-wider flex items-center gap-2">
            <IdCard className="w-4 h-4 text-teal-600" />
            <span>Dados do Paciente</span>
          </h2>
          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
            {clock || '--/--/---- --:--'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Document Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Documento de Identificação *
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setDocType('SUS');
                  setDocumento('');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                  docType === 'SUS'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>Cartão SUS (CNS)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocType('CPF');
                  setDocumento('');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                  docType === 'CPF'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>CPF</span>
              </button>
            </div>
            <input
              type="text"
              value={documento}
              onChange={(e) => handleDocChange(e.target.value)}
              placeholder={docType === 'SUS' ? '000 0000 0000 0000' : '000.000.000-00'}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              required
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome Completo do Paciente *
            </label>
            <div className="relative">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maria José da Silva"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                required
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Birth Date + Race/Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">Data de Nasc. *</label>
                {idadeCalculada && (
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                    {idadeCalculada}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={dataNasc}
                  onChange={(e) => setDataNasc(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Raça / Cor (SUS)</label>
              <select
                value={raca}
                onChange={(e) => setRaca(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              >
                <option value="Parda">Parda</option>
                <option value="Branca">Branca</option>
                <option value="Preta">Preta</option>
                <option value="Amarela">Amarela</option>
                <option value="Indígena">Indígena</option>
                <option value="Sem Informação">Sem Informação</option>
              </select>
            </div>
          </div>

          {/* Telephone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Telefone / WhatsApp (com DDD)
            </label>
            <div className="relative">
              <input
                type="tel"
                value={telefone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Address Section */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-2.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>Endereço do Paciente</span>
            </h3>

            {/* CEP */}
            <div className="mb-2.5">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                CEP (Preenchimento Automático)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  onBlur={handleCepSearch}
                  placeholder="00000-000"
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={handleCepSearch}
                  disabled={isSearchingCep}
                  className="absolute right-2.5 top-2 text-teal-600 hover:text-teal-800"
                >
                  {isSearchingCep ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Street + Number */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Logradouro *</label>
                <input
                  type="text"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Rua / Avenida"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Número</label>
                <input
                  type="text"
                  value={semNumero ? 'S/N' : numero}
                  disabled={semNumero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="123"
                  className={`w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                    semNumero ? 'bg-slate-200 text-slate-500' : 'bg-slate-50 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            {/* Without Number checkbox */}
            <div className="flex items-center gap-2 mb-2.5">
              <input
                type="checkbox"
                id="semNumeroCheckbox"
                checked={semNumero}
                onChange={(e) => setSemNumero(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
              <label htmlFor="semNumeroCheckbox" className="text-xs text-slate-600 select-none cursor-pointer">
                Imóvel sem número (S/N)
              </label>
            </div>

            {/* Neighborhood + City */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bairro *</label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cidade *</label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Observations */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Observações Clínicas / Queixa (Opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Paciente refere dor leve, retorno em 7 dias..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition resize-none"
            />
          </div>

          {/* Procedimentos Section */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                <Syringe className="w-4 h-4 text-teal-600" />
                <span>Procedimentos Realizados *</span>
              </h3>
              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                {procedimentosSelecionados.length} selecionado(s)
              </span>
            </div>

            {/* Input & Add Button */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputProc}
                onChange={(e) => setInputProc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProc();
                  }
                }}
                placeholder="Digite ou escolha abaixo..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => handleAddProc()}
                className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center justify-center transition active:scale-95 shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Frequent Procedures Quick Chips */}
            {frequentProcedimentos.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  Procedimentos Frequentes (Toque para adicionar):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  {frequentProcedimentos.map((proc) => {
                    const isSelected = procedimentosSelecionados.includes(proc);
                    return (
                      <button
                        key={proc}
                        type="button"
                        onClick={() => handleAddProc(proc)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition text-left flex items-center gap-1 border ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-teal-50 hover:border-teal-400'
                        }`}
                      >
                        <Plus className="w-3 h-3 shrink-0" />
                        <span>{proc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Procedures for this patient */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Procedimentos deste Atendimento:
              </label>
              {procedimentosSelecionados.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                  <p className="text-xs text-slate-400 italic">
                    Nenhum procedimento selecionado. Escolha um nas opções acima ou digite.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {procedimentosSelecionados.map((proc, idx) => (
                    <li
                      key={`${proc}-${idx}`}
                      className="flex justify-between items-center bg-teal-50 text-teal-900 border border-teal-200/80 px-3 py-1.5 rounded-xl text-xs font-medium"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                        {proc}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProc(idx)}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white py-3.5 px-4 rounded-xl font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-base transition active:scale-[0.99] disabled:opacity-75 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Salvando Atendimento...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Salvar Atendimento (BPA)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
