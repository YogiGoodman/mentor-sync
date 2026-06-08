import { redirect } from "next/navigation";

// Import was merged into Create Plan as an alternative entry mode. Keep the old
// route working as a permanent redirect into the import tab.
export default function ImportPlanRedirect() {
  redirect("/plan/create?mode=import");
}
