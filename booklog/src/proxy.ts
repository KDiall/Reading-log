import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PROTECTED = ["/dashboard", "/library", "/settings", "/rooms", "/messages", "/challenges/new"];
const AUTH_ONLY = ["/login", "/register"];

export default async function proxy(req: NextRequest) {
  const token = req.cookies.get("booklog_session")?.value;
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY.some((p) => pathname.startsWith(p));

  if (isProtected) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    try {
      await verifyToken(token);
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  if (isAuthOnly && token) {
    try {
      await verifyToken(token);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } catch {
      // invalid token — let them through to login/register
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|api|favicon.ico).*)"] };
