import { redirect } from "next/navigation";

export default function LegacyMonthRedirect() {
  redirect("/app/planeacion/mes");
}
