import "server-only";

import { cookies } from "next/headers";

import { getAuthSecret } from "@/lib/auth/auth-secret";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "@/lib/auth/constants";
import {
	type SessionPayload,
	signSession,
	verifySession,
} from "@/lib/auth/session-token";

function cookieBaseOptions() {
	const isProd = process.env.NODE_ENV === "production";
	return {
		httpOnly: true,
		sameSite: "lax" as const,
		secure: isProd,
		path: "/",
		maxAge: SESSION_MAX_AGE_SEC,
	};
}

/**
 * Sets the session cookie on the response (Route Handlers / Server Actions).
 */
export async function setSessionCookie(
	userId: string,
	email: string,
): Promise<void> {
	const secret = await getAuthSecret();
	const token = await signSession({ userId, email }, secret);
	const store = await cookies();
	store.set(SESSION_COOKIE_NAME, token, cookieBaseOptions());
}

/**
 * Clears the session cookie (testing / future logout). Not exposed in product UI in Phase 1 PRD.
 */
export async function clearSessionCookie(): Promise<void> {
	const store = await cookies();
	store.set(SESSION_COOKIE_NAME, "", {
		...cookieBaseOptions(),
		maxAge: 0,
	});
}

/**
 * Reads and verifies the session from the request cookies.
 */
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
	const store = await cookies();
	const raw = store.get(SESSION_COOKIE_NAME)?.value;
	if (!raw) {
		return null;
	}
	const secret = await getAuthSecret();
	return verifySession(raw, secret);
}
