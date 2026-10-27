/**
 * Normaliza telefone para somente digitos — fonte unica para gravar e buscar.
 * Assim "(11) 90000-0000" e "11900000000" viram a mesma chave, e o login da
 * familia por celular passa a casar com o valor armazenado.
 */
export function normalizePhone(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}
