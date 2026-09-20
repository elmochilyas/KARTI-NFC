import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type LoginResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Partial<Record<keyof LoginInput, string>> };

/**
 * Email + password sign-in for the Karti admin (single-operator MVP).
 * Runs server-side; validation errors preserve entered values via useActionState.
 */
export async function signInWithPassword(input: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "email" || field === "password") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Authentication is not configured yet. Connect Supabase first (see README).",
    };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return {
      ok: false,
      message: "Sign-in is temporarily unavailable. Please try again.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, message: "Invalid email or password." };
  }
  return { ok: true };
}

/** Ends the admin session and returns the post-logout destination. */
export async function signOut(): Promise<{ redirectTo: string }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Missing/unreachable Supabase: nothing to sign out of server-side.
    }
  }
  return { redirectTo: "/login" };
}
