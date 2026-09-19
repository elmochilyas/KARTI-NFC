import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Karti",
  description: "Sign in to the Karti admin dashboard.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; setup?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/dashboard";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-2xl font-bold tracking-tight text-text">Karti</p>
        <p className="mt-1 text-sm text-muted">Admin sign in</p>
      </div>
      <section
        aria-labelledby="login-heading"
        className="rounded-xl border border-border bg-surface p-6 shadow-sm"
      >
        <h1 id="login-heading" className="mb-5 text-lg font-semibold text-text">
          Sign in to your dashboard
        </h1>
        <LoginForm next={next} setupNotice={params.setup === "missing-env"} />
      </section>
    </main>
  );
}
