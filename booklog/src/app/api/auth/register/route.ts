import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Must contain a special character"),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
  displayName: z.string().min(1).max(50),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, username, displayName } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: existing.email === email ? "Email already in use" : "Username already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, username, displayName },
    });

    // Send verification email (non-blocking)
    const verifyToken = crypto.randomBytes(32).toString("hex");
    await prisma.verifyToken.create({
      data: {
        userId: user.id,
        token: verifyToken,
        type: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    sendVerificationEmail(email, verifyToken).catch(() => null);

    const token = await signToken({ userId: user.id });
    await setSessionCookie(token);

    return NextResponse.json(
      { user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
