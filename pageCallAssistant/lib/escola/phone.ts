/**
 * Normaliza telefone para somente digitos — fonte unica para gravar e buscar.
 * Assim "(11) 90000-0000" e "11900000000" viram a mesma chave, e o login da
 * familia por celular passa a casar com o valor armazenado.
 */
export function normalizePhone(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

/** 11 98765-4321 -> "11987654321"; aceita com 55 na frente. Celular BR: DDD + 9 dígitos */
export function whatsappValido(raw: string): string | null {
  let d = normalizePhone(raw);
  if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
  return /^[1-9][0-9]9\d{8}$/.test(d) ? d : null;
}
