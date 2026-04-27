import { getSession } from "@/lib/auth";
import { LandingClient } from "./LandingClient";

export default async function Home() {
  const session = await getSession();
  return <LandingClient isLoggedIn={!!session} />;
}
