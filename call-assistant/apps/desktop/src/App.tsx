import { useAuthStore } from "./application/store/authStore";
import { LoginPage } from "./ui/pages/LoginPage";
import { SessionPage } from "./ui/pages/SessionPage";

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <SessionPage /> : <LoginPage />;
}
