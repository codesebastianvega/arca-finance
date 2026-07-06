import { redirect } from "next/navigation";

export default function LegacyCardsRedirect() {
  redirect("/app/dinero/tarjetas");
}
