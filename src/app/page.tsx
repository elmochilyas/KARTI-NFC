import { redirect } from "next/navigation";

/**
 * Public root redirects to the primary marketing locale (French).
 * Exact `/` only — `/{slug}` profile resolution is unaffected because
 * `fr` is a reserved slug handled by its own static route.
 */
export default function RootPage(): never {
  redirect("/fr");
}
