import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets and the service worker.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons|.*\\.png$).*)",
  ],
};
