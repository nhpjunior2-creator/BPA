import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Atendimento, UserProfile } from '../types';

export function gerarPdfBpa(
  atendimentos: Atendimento[],
  perfil?: UserProfile | null,
  filtroData?: string
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Header Title
  doc.setFillColor(15, 118, 110); // Teal 700
  doc.rect(0, 0, 297, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('SISTEMA ÚNICO DE SAÚDE - SUS | BOLETIM DE PRODUÇÃO AMBULATORIAL (BPA)', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(204, 251, 241); // Teal 100
  const subTitle = `COLETA DE DADOS DE ENFERMAGEM | Data de Emissão: ${new Date().toLocaleString('pt-BR')}`;
  doc.text(subTitle, 14, 18);

  // Professional / Facility Info Bar
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const profNome = perfil?.displayName || 'Profissional de Enfermagem';
  const coren = perfil?.coren ? `COREN: ${perfil.coren}` : 'COREN: Não informado';
  const cns = perfil?.cns ? `CNS: ${perfil.cns}` : '';
  const unidade = perfil?.unidadeSaude ? `Unidade: ${perfil.unidadeSaude}` : 'Unidade de Saúde: Atenção Primária / Ambulatório';
  const filtroTexto = filtroData ? ` | Filtro por data: ${filtroData}` : '';

  doc.text(
    `Profissional: ${profNome} | ${coren} ${cns ? `| ${cns}` : ''} | ${unidade}${filtroTexto} | Total de Atendimentos: ${atendimentos.length}`,
    14,
    30
  );

  // Table Data
  const tableRows = atendimentos.map((at, idx) => {
    const dataHora = `${at.dataStr}\n${at.horaStr}`;
    const docInfo = `${at.nome}\n${at.docType}: ${at.documento}\nNasc: ${at.dataNasc.split('-').reverse().join('/')}`;
    const contatos = `${at.raca}\nTel: ${at.telefone || 'N/I'}`;
    const endereco = `${at.logradouro}, nº ${at.numero}\n${at.bairro} - ${at.cidade}`;
    const procs = at.procedimentos.join('\n• ');

    return [
      idx + 1,
      dataHora,
      docInfo,
      contatos,
      endereco,
      procs ? `• ${procs}` : 'Nenhum',
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [
      ['Nº', 'Data / Hora', 'Paciente / Documento', 'Raça / Contato', 'Endereço', 'Procedimentos Realizados']
    ],
    body: tableRows,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.5,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 62 },
      3: { cellWidth: 32 },
      4: { cellWidth: 65 },
      5: { cellWidth: 'auto' },
    },
    theme: 'grid',
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount} | Aplicativo Coleta Enfermagem BPA`,
        283,
        202,
        { align: 'right' }
      );
    },
  });

  const fileName = `BPA_Enfermagem_${filtroData ? filtroData.replace(/\//g, '-') : new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export function exportarCsvBpa(atendimentos: Atendimento[]): void {
  const headers = [
    'ID',
    'Data',
    'Hora',
    'Tipo Documento',
    'Numero Documento',
    'Nome Paciente',
    'Data Nascimento',
    'Raca/Cor',
    'Telefone',
    'CEP',
    'Logradouro',
    'Numero',
    'Bairro',
    'Cidade',
    'Procedimentos'
  ];

  const rows = atendimentos.map((a) => [
    a.id,
    a.dataStr,
    a.horaStr,
    a.docType,
    `"${a.documento}"`,
    `"${a.nome.replace(/"/g, '""')}"`,
    a.dataNasc,
    a.raca,
    `"${a.telefone}"`,
    `"${a.cep}"`,
    `"${a.logradouro.replace(/"/g, '""')}"`,
    `"${a.numero}"`,
    `"${a.bairro.replace(/"/g, '""')}"`,
    `"${a.cidade.replace(/"/g, '""')}"`,
    `"${a.procedimentos.join('; ')}"`
  ]);

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel
    [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bpa_producao_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportarJsonBackup(atendimentos: Atendimento[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(atendimentos, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `bpa_backup_dados_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
