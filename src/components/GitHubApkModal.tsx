import React, { useState } from 'react';
import {
  Smartphone,
  Github,
  Play,
  CheckCircle,
  Copy,
  ExternalLink,
  X,
  Download,
  Terminal,
  ShieldCheck
} from 'lucide-react';

interface GitHubApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

export const GitHubApkModal: React.FC<GitHubApkModalProps> = ({ isOpen, onClose, appUrl }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '1. Instalação Imediata no Android (PWA Nativo)',
      desc: 'Abra este link no Chrome do celular Android, toque nos 3 pontinhos (⋮) do navegador e selecione "Instalar aplicativo" ou "Adicionar à tela inicial". O app funcionará em tela cheia com ícone nativo e modo offline!',
      command: null,
    },
    {
      title: '2. Publicar o Código no seu GitHub',
      desc: 'Crie um repositório em sua conta GitHub (ex: coleta-enfermagem-bpa) e execute os comandos abaixo no seu terminal para enviar o código fonte:',
      command: `git init\ngit add .\ngit commit -m "feat: app enfermagem bpa com firebase e google drive"\ngit branch -M main\ngit remote add origin https://github.com/SEU_USUARIO/coleta-enfermagem-bpa.git\ngit push -u origin main`,
    },
    {
      title: '3. Gerar APK Android com Capacitor (Recomendado)',
      desc: 'Para compilar um arquivo .APK ou .AAB (Android App Bundle) pronto para o Google Play Console ou distribuição direta:',
      command: `npm install @capacitor/core @capacitor/cli @capacitor/android\nnpx cap init "Coleta Enfermagem" "br.gov.saude.coleta.enfermagem" --web-dir dist\nnpm run build\nnpx cap add android\nnpx cap open android`,
    },
    {
      title: '4. Gerar APK em 1 Clique com PWABuilder (Sem Android Studio)',
      desc: 'Acesse pwabuilder.com, cole o link deste aplicativo e clique em "Package for Android". Você baixa o APK assinado pronto para instalar no seu celular ou publicar no Google Play Console.',
      link: 'https://www.pwabuilder.com',
    },
    {
      title: '5. Google Play Console e Licenciamento Google',
      desc: 'No Google Play Console, crie um novo aplicativo, envie o Android App Bundle (.aab) gerado, adicione a política de privacidade e declare os escopos do Google Drive e Firebase configurados no Cloud Console.',
      link: 'https://play.google.com/console',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Publicação GitHub & APK Android</h2>
              <p className="text-[11px] text-teal-200">Guia completo para compilação e Play Store</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-teal-200 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
          <div className="bg-teal-50 border border-teal-200 p-3 rounded-2xl flex items-start gap-2 text-teal-900">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              O aplicativo já está configurado com autenticação oficial Google, regras de banco de dados
              Firebase Firestore e sincronização em nuvem Google Drive.
            </p>
          </div>

          <div className="space-y-3.5">
            {steps.map((st, i) => (
              <div key={st.title} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span>{st.title}</span>
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">{st.desc}</p>

                {st.command && (
                  <div className="relative group">
                    <pre className="bg-slate-900 text-teal-300 p-2.5 rounded-xl font-mono text-[10px] overflow-x-auto whitespace-pre leading-tight">
                      {st.command}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(st.command, i)}
                      className="absolute right-2 top-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg border border-slate-600 transition"
                      title="Copiar comando"
                    >
                      {copiedIndex === i ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {st.link && (
                  <a
                    href={st.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-white border border-teal-300 px-3 py-1.5 rounded-xl hover:bg-teal-50 transition"
                  >
                    <span>Abrir link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
