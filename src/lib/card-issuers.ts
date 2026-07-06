export const creditCardIssuerOptions = [
  "Nu",
  "RappiCard",
  "Banco Falabella",
  "Bancolombia",
  "Davivienda",
  "BBVA",
  "Banco de Bogota",
  "Scotiabank Colpatria",
  "Itaú",
  "Banco de Occidente",
  "AV Villas",
  "Banco Popular",
  "Codensa / Enel",
  "Finandina",
  "Otro emisor",
] as const;

export function normalizeCardIssuer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
