export type LeadStatus =
  | "novo"
  | "contato_iniciado"
  | "qualificado"
  | "trial"
  | "negociacao"
  | "convertido"
  | "perdido";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role: string | null;
  status: LeadStatus;
  score: number;
  origin: string;
  lastContact: Date | null;
  notes: string | null;
  createdAt: Date;
}

export interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  status?: LeadStatus;
  score?: number;
  origin?: string;
  notes?: string;
}
