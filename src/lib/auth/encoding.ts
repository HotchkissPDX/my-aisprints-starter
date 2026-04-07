const B64URL =
	/^[A-Za-z0-9_-]+={0,2}$/;

export function toBase64Url(bytes: Uint8Array): string {
	let bin = "";
	const chunk = 8192;
	for (let i = 0; i < bytes.length; i += chunk) {
		bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	const b64 = btoa(bin);
	return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array {
	if (!B64URL.test(s)) {
		throw new Error("Invalid base64url string");
	}
	const pad = 4 - (s.length % 4 || 4);
	const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad % 4);
	const bin = atob(padded);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) {
		out[i] = bin.charCodeAt(i);
	}
	return out;
}
