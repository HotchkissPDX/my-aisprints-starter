import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthSecretSync } from "@/lib/auth/auth-secret";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySession } from "@/lib/auth/session-token";

function isAuthPagePath(pathname: string): boolean {
	return pathname === "/" || pathname === "/signup";
}

function isQuestionsPath(pathname: string): boolean {
	return pathname === "/questions" || pathname.startsWith("/questions/");
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	let secret: string;
	try {
		secret = getAuthSecretSync();
	} catch {
		if (isQuestionsPath(pathname)) {
			return new NextResponse("Authentication is not configured.", {
				status: 500,
			});
		}
		return NextResponse.next();
	}

	const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	const session =
		token && (await verifySession(token, secret)) ? true : false;

	if (isQuestionsPath(pathname)) {
		if (!session) {
			return NextResponse.redirect(new URL("/", request.url));
		}
		return NextResponse.next();
	}

	if (isAuthPagePath(pathname)) {
		if (session) {
			return NextResponse.redirect(new URL("/questions", request.url));
		}
		return NextResponse.next();
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/signup", "/questions", "/questions/:path*"],
};
