import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return ok to prevent email enumeration
  if (!user) return NextResponse.json({ ok: true });

  await prisma.verifyToken.deleteMany({ where: { userId: user.id, type: "PASSWORD_RESET" } });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verifyToken.create({
    data: {
      userId: user.id,
      token,
      type: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  await sendPasswordResetEmail(email, token);
  return NextResponse.json({ ok: true });
}
