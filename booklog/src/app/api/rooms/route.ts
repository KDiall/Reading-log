import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  bookId: z.string().min(1),
  title: z.string().min(3).max(100),
  scheduledAt: z.string().min(1),
  durationMins: z.number().int().min(5).max(180),
  breakMins: z.number().int().min(0).max(30).optional(),
  maxParticipants: z.number().int().min(2).max(50).default(20),
  isPublic: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "SCHEDULED";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 12;

  const where: Record<string, unknown> = { isPublic: true };
  if (status === "SCHEDULED") {
    where.status = "SCHEDULED";
    where.scheduledAt = { gte: new Date() };
  } else if (status === "ACTIVE") {
    where.status = "ACTIVE";
  } else if (status === "ENDED") {
    where.status = "ENDED";
  }

  const [rooms, total] = await Promise.all([
    prisma.readingRoom.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { scheduledAt: "asc" },
      include: {
        book: { select: { id: true, title: true, authors: true, coverUrl: true } },
        host: { select: { username: true, displayName: true, avatarUrl: true } },
        _count: { select: { participants: true } },
      },
    }),
    prisma.readingRoom.count({ where }),
  ]);

  return NextResponse.json({ rooms, total, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { bookId, title, scheduledAt, durationMins, breakMins, maxParticipants, isPublic } = parsed.data;

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const room = await prisma.readingRoom.create({
    data: {
      hostId: session.userId,
      bookId,
      title,
      scheduledAt: new Date(scheduledAt),
      durationMins,
      breakMins: breakMins ?? null,
      maxParticipants,
      isPublic,
    },
  });

  // Auto-join host
  await prisma.roomParticipant.create({
    data: { roomId: room.id, userId: session.userId },
  });

  return NextResponse.json({ room }, { status: 201 });
}
