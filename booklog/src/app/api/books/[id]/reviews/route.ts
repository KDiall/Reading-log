import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional().nullable(),
  body: z.string().max(10000).optional().nullable(),
  hasSpoiler: z.boolean().default(false),
  format: z.enum(["EBOOK", "AUDIOBOOK"]),
  dateRead: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookId } = await params;
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") ?? "recent";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = 10;
  const skip = (page - 1) * limit;

  const orderBy =
    sort === "liked"
      ? { likesCount: "desc" as const }
      : sort === "highest"
      ? { rating: "desc" as const }
      : sort === "lowest"
      ? { rating: "asc" as const }
      : { createdAt: "desc" as const };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { bookId },
      orderBy,
      skip,
      take: limit,
      include: {
        user: {
          select: { username: true, displayName: true, avatarUrl: true },
        },
      },
    }),
    prisma.review.count({ where: { bookId } }),
  ]);

  return NextResponse.json({ reviews, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bookId } = await params;

  const existing = await prisma.review.findUnique({
    where: { userId_bookId: { userId: session.userId, bookId } },
  });
  if (existing) {
    return NextResponse.json({ error: "You already reviewed this book" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  const review = await prisma.review.create({
    data: {
      userId: session.userId,
      bookId,
      rating: data.rating,
      title: data.title ?? null,
      body: data.body ?? null,
      hasSpoiler: data.hasSpoiler,
      format: data.format,
      dateRead: data.dateRead ? new Date(data.dateRead) : null,
    },
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}
