import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { redirectAuthenticatedUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Вход",
};

export default async function LoginPage() {
  await redirectAuthenticatedUser();
  return <LoginForm />;
}
