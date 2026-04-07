import { getCloudflareContext } from "@opennextjs/cloudflare";

function secretFromEnv(env: { AUTH_SECRET?: string }): string | undefined {
	const s = env.AUTH_SECRET;
	return typeof s === "string" && s.length > 0 ? s : undefined;
}

/**
 * Resolve `AUTH_SECRET` for async server contexts (Route Handlers, Server Components, etc.).
 */
export async function getAuthSecret(): Promise<string> {
	const fromProcess = process.env.AUTH_SECRET;
	if (typeof fromProcess === "string" && fromProcess.length > 0) {
		return fromProcess;
	}
	try {
		const { env } = await getCloudflareContext({ async: true });
		const s = secretFromEnv(env);
		if (s) {
			return s;
		}
	} catch {
		/* outside a Cloudflare request (e.g. build, tests) */
	}
	throw new Error(
		"AUTH_SECRET is not set. Add it to .dev.vars for local development or set a Wrangler secret for production.",
	);
}

/**
 * Resolve `AUTH_SECRET` synchronously (e.g. Next.js middleware on Workers).
 * Falls back to `process.env.AUTH_SECRET` when Cloudflare context is unavailable.
 */
export function getAuthSecretSync(): string {
	const fromProcess = process.env.AUTH_SECRET;
	if (typeof fromProcess === "string" && fromProcess.length > 0) {
		return fromProcess;
	}
	try {
		const { env } = getCloudflareContext({ async: false });
		const s = secretFromEnv(env);
		if (s) {
			return s;
		}
	} catch {
		/* not in worker / sync context */
	}
	throw new Error(
		"AUTH_SECRET is not set. Add it to .dev.vars for local development or set a Wrangler secret for production.",
	);
}
