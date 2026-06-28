import { redirect, notFound } from "next/navigation";
import { getCurrentUser, toSafeUser } from "@/lib/auth";
import { loadConsultationFor, serializeConsultation } from "@/lib/consultations";
import Topbar from "@/components/Topbar";
import ConsultationRoom from "@/components/ConsultationRoom";

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const consultation = await loadConsultationFor(id, user);
  if (!consultation) notFound();

  return (
    <>
      <Topbar user={toSafeUser(user)} />
      <div className="container">
        <ConsultationRoom
          user={toSafeUser(user)}
          initial={serializeConsultation(consultation)}
        />
      </div>
    </>
  );
}
