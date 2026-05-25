import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["WANT_TO_READ", "CURRENTLY_READING", "FINISHED", "DNF", "RE_READING"]).optional(),
  format: z.enum(["EBOOK", "AUDIOBOOK"]).optional(),
  currentPage: z.number().int().min(0).optional().nullable(),
  progressPct: z.number().min(0).max(100).optional().nullable(),
  startDate: z.string().optional().nullable(),
  finishDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userBook = await prisma.userBook.findUnique({ where: { id } });
  if (!userBook || userBook.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;

  // Auto-set dates on status change
  if (data.status === "CURRENTLY_READING" && !userBook.startDate && !data.startDate) {
    data.startDate = new Date().toISOString();
  }
  if (data.status === "FINISHED" && !userBook.finishDate && !data.finishDate) {
    data.finishDate = new Date().toISOString();
  }

  const updated = await prisma.userBook.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      finishDate: data.finishDate ? new Date(data.finishDate) : undefined,
    },
    include: { book: true },
  });

  // If book was marked finished, trigger challenge progress update
  if (data.status === "FINISHED" && userBook.status !== "FINISHED") {
    await onBookFinished(session.userId, userBook.bookId);
  }

  return NextResponse.json({ userBook: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userBook = await prisma.userBook.findUnique({ where: { id } });
  if (!userBook || userBook.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userBook.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

async function onBookFinished(userId: string, bookId: string) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });

  const active = await prisma.userChallenge.findMany({
    where: {
      userId,
      challenge: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        type: { in: ["BOOK_COUNT", "PAGE_COUNT"] },
      },
      completedAt: null,
    },
    include: { challenge: true },
  });

  for (const uc of active) {
    const increment =
      uc.challenge.type === "BOOK_COUNT" ? 1 : book?.pageCount ?? 0;

    const updated = await prisma.userChallenge.update({
      where: { id: uc.id },
      data: { progress: { increment } },
    });

    const pct = (updated.progress / uc.challenge.targetValue) * 100;
    const milestones = [25, 50, 75, 100];
    const prevPct = ((updated.progress - increment) / uc.challenge.targetValue) * 100;
    for (const m of milestones) {
      if (prevPct < m && pct >= m) {
        // milestone crossed — completedAt set at 100%
        if (m === 100 && !uc.completedAt) {
          await prisma.userChallenge.update({
            where: { id: uc.id },
            data: { completedAt: new Date() },
          });
        }
        // future: store milestone events for notifications
      }
    }
  }
}
