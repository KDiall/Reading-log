import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const schema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional().nullable(),
  pronouns: z.string().max(50).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}/).optional().nullable(),
  fontPreference: z.enum(["inter", "lora", "playfair", "dm-sans", "jetbrains"]).optional().nullable(),
  favoriteGenres: z.array(z.string()).max(10).optional(),
  socialLinks: z.record(z.string(), z.string().url()).optional().nullable(),
  isPrivate: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { socialLinks, ...rest } = parsed.data;
  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      ...rest,
      ...(socialLinks !== undefined
        ? { socialLinks: socialLinks === null ? Prisma.JsonNull : socialLinks }
        : {}),
    },
    select: {
      id: true,
      displayName: true,
      bio: true,
      pronouns: true,
      location: true,
      avatarUrl: true,
      bannerUrl: true,
      accentColor: true,
      fontPreference: true,
      favoriteGenres: true,
      socialLinks: true,
      isPrivate: true,
    },
  });

  return NextResponse.json({ user });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      pronouns: true,
      location: true,
      avatarUrl: true,
      bannerUrl: true,
      accentColor: true,
      fontPreference: true,
      favoriteGenres: true,
      socialLinks: true,
      isPrivate: true,
    },
  });

  return NextResponse.json({ user });
}
