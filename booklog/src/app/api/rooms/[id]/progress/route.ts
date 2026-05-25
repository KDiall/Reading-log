import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { z } from "zod";

const schema = z.object({
  page: z.number().int().min(0).optional(),
  pct: z.number().min(0).max(100).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const room = await prisma.readingRoom.findUnique({ where: { id } });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId: id, userId: session.userId } },
  });
  if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { page, pct } = parsed.data;

  // Log to ProgressLog via the user's UserBook for this book
  const userBook = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId: session.userId, bookId: room.bookId } },
  });

  if (userBook) {
    await prisma.progressLog.create({
      data: { userBookId: userBook.id, page: page ?? null, pct: pct ?? null },
    });
    await prisma.userBook.update({
      where: { id: userBook.id },
      data: {
        currentPage: page ?? userBook.currentPage,
        progressPct: pct ?? userBook.progressPct,
      },
    });
  }

  // Update participant pages logged
  if (page !== undefined) {
    const prev = userBook?.currentPage ?? 0;
    const delta = Math.max(0, page - prev);
    await prisma.roomParticipant.update({
      where: { roomId_userId: { roomId: id, userId: session.userId } },
      data: { pagesLogged: { increment: delta } },
    });
  }

  await pusherServer.trigger(`presence-room-${id}`, "room:progress-updated", {
    userId: session.userId,
    page: page ?? null,
    pct: pct ?? null,
  });

  return NextResponse.json({ ok: true });
}
