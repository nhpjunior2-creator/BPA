export interface CepResult {
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export async function consultarCep(cep: string): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) {
    return null;
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;

    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    };
  } catch (err) {
    console.warn('Erro ao consultar CEP:', err);
    return null;
  }
}
