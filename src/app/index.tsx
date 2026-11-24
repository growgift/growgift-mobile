import { Redirect } from "expo-router";
import { useSession } from "../lib/session";

export default function Index() {
  const { session } = useSession();
  if (!session) return <Redirect href="/welcome" />;
  return <Redirect href={session.role === "child" ? "/kid" : "/(tabs)"} />;
}
