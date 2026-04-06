import ky from "ky";
import type {
  CreateSessionRequest,
  Session,
  Transcript,
} from "@call-assistant/shared-types";
import { useAuthStore } from "../application/store/authStore";

const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080";
const BASE_URL = `${BACKEND_ORIGIN}/api/v1`;

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const http = ky.create({ prefixUrl: BASE_URL, timeout: 10000 });

export const sessionApi = {
  create: (request: CreateSessionRequest): Promise<Session> =>
    http.post("sessions", { json: request, headers: authHeaders() }).json<Session>(),

  get: (id: string): Promise<Session> =>
    http.get(`sessions/${id}`, { headers: authHeaders() }).json<Session>(),

  stop: (id: string): Promise<Session> =>
    http.patch(`sessions/${id}/stop`, { headers: authHeaders() }).json<Session>(),

  getTranscripts: (id: string): Promise<Transcript[]> =>
    http.get(`sessions/${id}/transcripts`, { headers: authHeaders() }).json<Transcript[]>(),
};
