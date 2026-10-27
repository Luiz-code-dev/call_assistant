import Constants from "expo-constants";

// Base do site/API — o app consome as mesmas rotas /api/escola/* da web.
export const API_BASE =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "https://www.speakflow.ia.br";

// Enviado em toda requisicao: o servidor so devolve o token no corpo quando
// reconhece o app por este cabecalho (a web continua so com cookie).
export const APP_CLIENT = "speakflow-escolas-app";
