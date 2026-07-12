import { redirect } from "next/navigation";
import { getCurrentWorkspaceContext } from "@/src/lib/auth";

export default async function RootPage() {
  const context = await getCurrentWorkspaceContext();
  redirect(context ? "/app" : "/sign-in");
}
