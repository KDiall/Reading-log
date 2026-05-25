import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Must contain a special character"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const record = await prisma.verifyToken.findUnique({ where: { token } });

  if (!record || record.type !== "PASSWORD_RESET") {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
  await prisma.verifyToken.delete({ where: { token } });

  return NextResponse.json({ ok: true });
}
