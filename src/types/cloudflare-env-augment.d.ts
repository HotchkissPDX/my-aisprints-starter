/** Merged into `Cloudflare.Env` from wrangler-generated types. */
declare namespace Cloudflare {
	interface Env {
		/** Session signing secret: `.dev.vars` locally, `wrangler secret put AUTH_SECRET` in production. */
		AUTH_SECRET: string;
	}
}
