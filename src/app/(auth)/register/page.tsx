import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { redirectAuthenticatedUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Регистрация",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  await redirectAuthenticatedUser();
  const params = await searchParams;
  const initialRole = params.role === "MASTER" ? "MASTER" : "CLIENT";

  return <RegisterForm initialRole={initialRole} />;
}
