"use client";

import { useState, useEffect } from "react";
import { Cookie, Shield, BarChart2, Megaphone, Zap, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CookiePrefs {
  essential: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
  updatedAt: string;
}

const STORAGE_KEY = "sf_cookie_consent";
const DEFAULT_PREFS: CookiePrefs = {
  essential: true,
  functional: true,
  analytics: false,
  marketing: false,
  decided: false,
  updatedAt: "",
};

function loadPrefs(): CookiePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: CookiePrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }));
}

export function useCookieConsent() {
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULT_PREFS);
  useEffect(() => { setPrefs(loadPrefs()); }, []);
  return prefs;
}

export default function CookieConsent() {
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULT_PREFS);
  const [mounted, setMounted] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(loadPrefs());
    setMounted(true);
  }, []);

  if (!mounted || prefs.decided) return null;

  const toggle = (key: keyof Omit<CookiePrefs, "essential" | "decided" | "updatedAt">) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const acceptAll = () => {
    const updated = { essential: true as const, functional: true, analytics: true, marketing: true, decided: true, updatedAt: "" };
    savePrefs(updated);
    setPrefs(updated);
  };

  const acceptEssential = () => {
    const updated = { essential: true as const, functional: false, analytics: false, marketing: false, decided: true, updatedAt: "" };
    savePrefs(updated);
    setPrefs(updated);
  };

  const saveCustom = () => {
    const updated = { ...prefs, decided: true };
    savePrefs(updated);
    setPrefs(updated);
  };

  const categories = [
    {
      id: "essential",
      icon: <Shield className="h-4 w-4 text-emerald-400" />,
      label: "Essenciais",
      desc: "Necessários para autenticação, sessão e segurança do site. Não podem ser desativados.",
      always: true,
      value: true,
    },
    {
      id: "functional",
      icon: <Zap className="h-4 w-4 text-violet-400" />,
      label: "Funcionais",
      desc: "Lembram suas preferências de idioma, tema e configurações de acessibilidade.",
      always: false,
      value: prefs.functional,
    },
    {
      id: "analytics",
      icon: <BarChart2 className="h-4 w-4 text-blue-400" />,
      label: "Análise",
      desc: "Ajudam a entender como você usa o site para melhorarmos a experiência. Dados anonimizados.",
      always: false,
      value: prefs.analytics,
    },
    {
      id: "marketing",
      icon: <Megaphone className="h-4 w-4 text-amber-400" />,
      label: "Marketing",
      desc: "Permitem exibir conteúdo personalizado e medir a eficácia de campanhas.",
      always: false,
      value: prefs.marketing,
    },
  ];

  return (
    <>
      {/* Overlay */}
      {showManager && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowManager(false)}
        />
      )}

      {/* Manager Modal */}
      {showManager && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-2xl border border-border/60 bg-card shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
            <div className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-violet-400" />
              <h2 className="font-semibold text-base">Gerenciar cookies</h2>
            </div>
            <button onClick={() => setShowManager(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Utilizamos cookies para melhorar sua experiência no SpeakFlow. Você pode escolher quais categorias ativar, exceto os essenciais que são necessários para o funcionamento do site.
            </p>

            {categories.map((cat) => (
              <div key={cat.id} className="rounded-xl border border-border/40 overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {cat.icon}
                    <span className="text-sm font-medium">{cat.label}</span>
                    {cat.always && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                        Sempre ativo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {!cat.always && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggle(cat.id as "functional" | "analytics" | "marketing"); }}
                        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${cat.value ? "bg-violet-600" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${cat.value ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    )}
                    {expanded === cat.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </button>
                {expanded === cat.id && (
                  <div className="px-4 pb-3 pt-0">
                    <p className="text-xs text-muted-foreground leading-relaxed">{cat.desc}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 px-5 py-4 border-t border-border/40">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={acceptEssential}>
              Só essenciais
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={saveCustom}>
              Salvar seleção
            </Button>
            <Button size="sm" className="flex-1 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0" onClick={acceptAll}>
              Aceitar todos
            </Button>
          </div>
        </div>
      )}

      {/* Banner (only when manager is closed) */}
      {!showManager && (
        <div className="fixed left-2 right-2 z-50 mx-auto max-w-2xl rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl sm:bottom-4 sm:left-4 sm:right-4" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 0.5rem)' }}>
          {/* Mobile compact version */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 sm:hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
              <Cookie className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-xs font-medium flex-1 leading-tight">Este site usa cookies</p>
            <button onClick={acceptEssential} className="text-[11px] text-muted-foreground whitespace-nowrap px-2 py-1 rounded-lg hover:bg-white/5">
              Recusar
            </button>
            <Button size="sm" className="text-[11px] h-7 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 border-0" onClick={acceptAll}>
              Aceitar
            </Button>
          </div>
          {/* Desktop full version */}
          <div className="hidden sm:block px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
                <Cookie className="h-5 w-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-0.5">Este site usa cookies</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Usamos cookies essenciais e opcionais para melhorar sua experiência, analisar o uso do site e personalizar conteúdo. Confira nossa{" "}
                  <a href="/privacy" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Política de Privacidade</a>.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8" onClick={acceptEssential}>Só essenciais</Button>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setShowManager(true)}>Gerenciar</Button>
              <Button size="sm" className="text-xs h-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0" onClick={acceptAll}>Aceitar todos</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CookieManagerButton() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULT_PREFS);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(loadPrefs());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toggle = (key: keyof Omit<CookiePrefs, "essential" | "decided" | "updatedAt">) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const save = (newPrefs: Partial<CookiePrefs>) => {
    const updated = { ...prefs, ...newPrefs, decided: true };
    savePrefs(updated);
    setPrefs(updated);
    setOpen(false);
  };

  const categories = [
    { id: "essential", icon: <Shield className="h-4 w-4 text-emerald-400" />, label: "Essenciais", desc: "Necessários para autenticação, sessão e segurança do site.", always: true, value: true },
    { id: "functional", icon: <Zap className="h-4 w-4 text-violet-400" />, label: "Funcionais", desc: "Lembram suas preferências de idioma, tema e configurações.", always: false, value: prefs.functional },
    { id: "analytics", icon: <BarChart2 className="h-4 w-4 text-blue-400" />, label: "Análise", desc: "Ajudam a entender como você usa o site. Dados anonimizados.", always: false, value: prefs.analytics },
    { id: "marketing", icon: <Megaphone className="h-4 w-4 text-amber-400" />, label: "Marketing", desc: "Exibição de conteúdo personalizado e medição de campanhas.", always: false, value: prefs.marketing },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        Gerenciar cookies
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-2xl border border-border/60 bg-card shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full">
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
              <div className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-violet-400" />
                <h2 className="font-semibold text-base">Gerenciar cookies</h2>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="rounded-xl border border-border/40 overflow-hidden">
                  <button onClick={() => setExpanded(expanded === cat.id ? null : cat.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {cat.icon}
                      <span className="text-sm font-medium">{cat.label}</span>
                      {cat.always && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Sempre ativo</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {!cat.always && (
                        <button onClick={(e) => { e.stopPropagation(); toggle(cat.id as "functional" | "analytics" | "marketing"); }}
                          className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${cat.value ? "bg-violet-600" : "bg-muted"}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${cat.value ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      )}
                      {expanded === cat.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </button>
                  {expanded === cat.id && (
                    <div className="px-4 pb-3"><p className="text-xs text-muted-foreground leading-relaxed">{cat.desc}</p></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border/40">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => save({ functional: false, analytics: false, marketing: false })}>
                Só essenciais
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => save({})}>
                Salvar seleção
              </Button>
              <Button size="sm" className="flex-1 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0"
                onClick={() => save({ functional: true, analytics: true, marketing: true })}>
                Aceitar todos
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
