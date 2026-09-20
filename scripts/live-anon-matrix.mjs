/**
 * Live anonymous attack matrix (read-only by design).
 *
 * Expects SUPABASE_URL + SUPABASE_ANON_KEY in the environment (GitHub
 * secrets in CI, .env.local values locally). Every probe is either a read
 * that must return zero rows or a write that must be rejected — a passing
 * run creates nothing, so no cleanup is required. Never point this at a
 * production database with real traffic; use the development project.
 *
 * Exit 0 = matrix holds. Exit 1 = unexpected access (investigate).
 * Exit 2 = misconfigured environment.
 *
 * PRODUCTION GUARD (Phase 14): the current Supabase project is production.
 * This script refuses to run against the production host — re-point
 * SUPABASE_URL_DEV / SUPABASE_ANON_KEY_DEV at the development project once
 * it exists (see specs/DEPLOYMENT.md §9).
 */
const base = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
if (!base || !anon) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY (development project only).");
  process.exit(2);
}
// Never run against production, even for reads: secrets get re-pointed,
// mistakes happen. Production host is public knowledge (anon key is public);
// blocking it here costs nothing.
if (base.includes("lsnreflcydjaovwvdepp")) {
  console.error("Refusing: this host is the PRODUCTION project. Use the development project.");
  process.exit(2);
}

const headers = { apikey: anon, Authorization: `Bearer ${anon}` };
let failures = 0;

function check(label, cond, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failures += 1;
}

async function probe(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...headers,
      ...(body ? { "Content-Type": "application/json", Prefer: "return=representation" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, text: (await res.text()).slice(0, 200) };
}

// Reads must return zero rows (RLS default-deny, no anon policies).
for (const table of ["clients", "profiles", "profile_links", "cards"]) {
  const r = await probe("GET", `/rest/v1/${table}?select=id&limit=1`);
  check(
    `anon SELECT ${table} denied`,
    r.status === 200 && r.text === "[]",
    `${r.status} ${r.text}`,
  );
}

// INSERTs are rejected outright with 42501 (RLS violation).
{
  const r = await probe("POST", "/rest/v1/clients", { name: "CI-PROBE" });
  check(
    "anon INSERT clients rejected",
    r.status === 401 || r.status === 403,
    `${r.status} ${r.text}`,
  );
}
// Row-addressed UPDATE/DELETE are denied by RLS row filtering: the response
// succeeds HTTP-wise but touches zero rows and returns zero rows. Against a
// nonexistent id the only safe outcomes are `200 []` and `204` (empty).
{
  const id = "eq.00000000-0000-0000-0000-000000000000";
  const up = await probe("PATCH", `/rest/v1/clients?id=${id}`, { name: "CI-PROBE" });
  check(
    "anon UPDATE affects zero rows",
    up.status === 200 && up.text === "[]",
    `${up.status} ${up.text}`,
  );
  const del = await probe("DELETE", `/rest/v1/clients?id=${id}`);
  check(
    "anon DELETE affects zero rows",
    del.status === 204 && del.text === "",
    `${del.status} ${del.text}`,
  );
}

// Allowed-MIME storage upload must fail on RLS (proves policy, creates nothing).
const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde,
]);
const up = await fetch(`${base}/storage/v1/object/profile-assets/ci-probe.png`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "image/png" },
  body: png,
});
check("anon storage upload rejected", up.status === 400 || up.status === 403, `${up.status}`);

process.exit(failures === 0 ? 0 : 1);
