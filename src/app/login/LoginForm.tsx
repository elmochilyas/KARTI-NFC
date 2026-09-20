"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { loginAction, type LoginState } from "./actions";

const INITIAL_STATE: LoginState = { ok: false, message: "" };

/** Email + password admin login form with validation, error and pending states. */
export function LoginForm({ next, setupNotice }: { next: string; setupNotice: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {setupNotice ? (
        <p
          role="note"
          className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-muted"
        >
          Supabase is not connected yet. Add your keys to{" "}
          <code className="font-mono">.env.local</code> to enable sign-in.
        </p>
      ) : null}
      {state.ok === false && state.message ? (
        <p
          role="alert"
          className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger"
        >
          {state.message}
        </p>
      ) : null}
      <Field
        id="email"
        label="Email"
        error={state.ok === false ? state.fieldErrors?.email : undefined}
      >
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@karti.app"
          defaultValue={state.email ?? ""}
          invalid={Boolean(state.ok === false && state.fieldErrors?.email)}
          required
        />
      </Field>
      <Field
        id="password"
        label="Password"
        error={state.ok === false ? state.fieldErrors?.password : undefined}
      >
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={Boolean(state.ok === false && state.fieldErrors?.password)}
          required
        />
      </Field>
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
