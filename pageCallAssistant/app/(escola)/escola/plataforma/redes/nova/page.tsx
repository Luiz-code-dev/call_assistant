"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EscPageHeader from "@/components/escola/layout/EscPageHeader";
import { ChevronLeft, Building2 } from "lucide-react";

interface FormState {
  name: string;
  city: string;
  state: string;
  ibgeCode: string;
}

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function NovaRedePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ name: "", city: "", state: "", ibgeCode: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.city.trim() || !form.state) {
      setError("Preencha nome, município e UF.");
      return;
    }
    setSaving(true);
    const r = await fetch("/api/escola/plataforma/redes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "Erro ao criar rede.");
      return;
    }
    const { id } = await r.json();
    router.push(`/escola/plataforma/redes/${id}`);
  }

  const field = "block text-[14px] font-medium text-gray-700 mb-1.5";
  const input = "w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]";

  return (
    <div className="flex flex-col min-h-full">
      <EscPageHeader
        breadcrumb={[
          { label: "Plataforma", href: "/escola/plataforma" },
          { label: "Redes", href: "/escola/plataforma/redes" },
          { label: "Nova rede" },
        ]}
        title="Nova rede de ensino"
        subtitle="Cadastre a rede para depois convidar o gestor da Secretaria."
      />

      <div className="px-7 py-8 max-w-xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className={field}>Nome da rede <span className="text-red-500">*</span></label>
            <input
              className={input}
              placeholder="Ex: Secretaria Municipal de Educação de Campinas"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-[1fr_100px] gap-4">
            <div>
              <label className={field}>Município <span className="text-red-500">*</span></label>
              <input
                className={input}
                placeholder="Ex: Campinas"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                required
              />
            </div>
            <div>
              <label className={field}>UF <span className="text-red-500">*</span></label>
              <select
                className={input}
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                required
              >
                <option value="">UF</option>
                {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={field}>Código IBGE <span className="text-[12px] text-[#5B5470] font-normal">(opcional)</span></label>
            <input
              className={input}
              placeholder="Ex: 3509502"
              value={form.ibgeCode}
              onChange={(e) => set("ibgeCode", e.target.value)}
              maxLength={7}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            >
              <Building2 size={15} />
              {saving ? "Criando..." : "Criar rede"}
            </button>
            <Link
              href="/escola/plataforma/redes"
              className="inline-flex items-center gap-1.5 text-[14px] text-[#5B5470] hover:text-gray-700 transition-colors min-h-[44px] px-2"
            >
              <ChevronLeft size={15} />
              Voltar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
