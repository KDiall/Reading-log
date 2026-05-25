import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status"); // "active" | "upcoming" | "ended"
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = 12;
  const skip = (page - 1) * limit;

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isPublic: true };
  if (type) where.type = type;
  if (status === "active") {
    where.startDate = { lte: now };
    where.endDate = { gte: now };
  } else if (status === "upcoming") {
    where.startDate = { gt: now };
  } else if (status === "ended") {
    where.endDate = { lt: now };
  }

  const [challenges, total] = await Promise.all([
    prisma.challenge.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { participants: true } } },
    }),
    prisma.challenge.count({ where }),
  ]);

  return NextResponse.json({ challenges, total, page, pages: Math.ceil(total / limit) });
}

const createSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  type: z.enum(["BOOK_COUNT", "PAGE_COUNT", "GENRE_BINGO", "THEME_BASED"]),
  targetValue: z.number().int().min(1),
  startDate: z.string(),
  endDate: z.string(),
  isPublic: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { title, description, type, targetValue, startDate, endDate, isPublic } = parsed.data;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  const challenge = await prisma.challenge.create({
    data: {
      creatorId: session.userId,
      title,
      description: description ?? null,
      type,
      targetValue,
      startDate: start,
      endDate: end,
      isPublic,
    },
  });

  // Auto-join creator
  await prisma.userChallenge.create({
    data: { userId: session.userId, challengeId: challenge.id },
  });

  return NextResponse.json({ challenge }, { status: 201 });
}
