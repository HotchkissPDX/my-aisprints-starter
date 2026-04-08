import "server-only";

import { NextResponse } from "next/server";

import { getSessionFromCookies } from "@/lib/auth/session-cookie";

export type RequireAuthResult =
	| { ok: true; userId: string }
	| { ok: false; response: NextResponse };

/**
 * Session check for Route Handlers. Returns 401 JSON when unauthenticated.
 */
export async function requireAuth(): Promise<RequireAuthResult> {
	const session = await getSessionFromCookies();
	if (!session) {
		return {
			ok: false,
			response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
		};
	}
	return { ok: true, userId: session.userId };
}
