import { redirect } from "next/navigation";

export default function LegacyAccountsRedirect() {
  redirect("/app/dinero/cuentas");
}
