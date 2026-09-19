"use server";

import { redirect } from "next/navigation";
import {
  loginSchema,
  signInWithPassword,
  signOut,
  type LoginResult,
} from "@/features/auth/service";

export type LoginState = LoginResult & { email?: string };

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    const result = await signInWithPassword({ email, password });
    return { ...result, email };
  }

  const result = await signInWithPassword(parsed.data);
  if (!result.ok) {
    return { ...result, email };
  }

  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  const { redirectTo } = await signOut();
  redirect(redirectTo);
}
