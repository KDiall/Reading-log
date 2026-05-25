import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

// POST — resend verification email
export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ error: "Already verified" }, { status: 400 });

  // Delete any existing verify tokens
  await prisma.verifyToken.deleteMany({ where: { userId: user.id, type: "EMAIL_VERIFY" } });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verifyToken.create({
    data: {
      userId: user.id,
      token,
      type: "EMAIL_VERIFY",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await sendVerificationEmail(user.email, token);
  return NextResponse.json({ ok: true });
}

// GET — confirm token
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const record = await prisma.verifyToken.findUnique({ where: { token } });
  if (!record || record.type !== "EMAIL_VERIFY") {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } });
  await prisma.verifyToken.delete({ where: { token } });

  return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
}
