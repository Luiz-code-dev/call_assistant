export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { apenasEscolas, agendadoresInternos } = await import("./lib/escola/escopo");
    // Instância só do SpeakFlow Escolas (APP_SCOPE=escolas) não liga as rotinas do SpeakFlow IA,
    // que dependem do banco dele. Sem a variável, tudo liga como sempre.
    if (!apenasEscolas()) {
      const { startCronJobs } = await import("./lib/cron-runner");
      startCronJobs();
    }
    // Com ESCOLAS_AGENDADORES=externo, os lembretes do Escolas são disparados por um agendador
    // de fora (rotas /api/escola/cron/agenda e /api/escola/cron/avisos-familia).
    if (agendadoresInternos()) {
      // SpeakFlow Escolas: lembrete da agenda de estudos (não mexe nas rotinas acima)
      const { iniciarAvisosDaAgenda } = await import("./lib/escola/agenda-avisos");
      iniciarAvisosDaAgenda();
      // SpeakFlow Escolas: avisos do reforço para a família (24 horas sem estudar)
      const { iniciarAvisosDaFamilia } = await import("./lib/escola/avisos-familia");
      iniciarAvisosDaFamilia();
    }
  }
}
