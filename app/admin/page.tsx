import { notFound } from "next/navigation";
import { esAdmin } from "@/lib/admin-auth";
import PanelAdmin from "./panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel de contactos | Mauri", robots: "noindex,nofollow" };

export default async function AdminPage() {
  if (!(await esAdmin())) notFound();
  return <PanelAdmin />;
}
