import { redirect } from "next/navigation";
import { getCurrentUser, toSafeUser } from "@/lib/auth";
import Topbar from "@/components/Topbar";
import PatientDashboard from "@/components/PatientDashboard";
import DoctorDashboard from "@/components/DoctorDashboard";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const safe = toSafeUser(user);

  return (
    <>
      <Topbar user={safe} />
      <div className="container">
        {safe.role === "doctor" ? <DoctorDashboard user={safe} /> : <PatientDashboard user={safe} />}
      </div>
    </>
  );
}
