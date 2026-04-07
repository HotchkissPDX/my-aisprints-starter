import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	css: {
		postcss: { plugins: [] },
	},
	resolve: {
		alias: {
			"@": path.join(root, "src"),
		},
	},
	test: {
		environment: "node",
	},
});
