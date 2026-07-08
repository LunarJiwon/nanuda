import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * On-demand cache busting for the ISR list pages (all `export const revalidate = 60`). Posts are
 * written directly from the browser to Firestore (see posts-client.ts) with no server action in
 * the path, so nothing else would tell Next.js a new post exists until the next natural 60s
 * revalidation — the editor calls this right after a successful publish so the list the reader
 * lands on next isn't stale for up to a minute.
 *
 * No auth check: this only forces already-public pages to re-render from already-public data, so
 * the worst case of abuse is a few extra Firestore reads, not a data or security risk. The fixed
 * allowlist below (rather than revalidating an arbitrary caller-supplied path) is what actually
 * bounds that risk.
 */
const ALLOWED_PATHS = new Set(["/", "/daily", "/info", "/art", "/quote", "/archive"]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const paths = Array.isArray(body?.paths) ? body.paths : [];
  for (const path of paths) {
    if (typeof path === "string" && ALLOWED_PATHS.has(path)) revalidatePath(path);
  }
  return NextResponse.json({ ok: true });
}
