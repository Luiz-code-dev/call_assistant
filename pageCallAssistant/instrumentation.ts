export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronJobs } = await import("./lib/cron-runner");
    startCronJobs();
    // SpeakFlow Escolas: lembrete da agenda de estudos (não mexe nas rotinas acima)
    const { iniciarAvisosDaAgenda } = await import("./lib/escola/agenda-avisos");
    iniciarAvisosDaAgenda();
  }
}
