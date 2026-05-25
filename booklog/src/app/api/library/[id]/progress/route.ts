import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { syncProgress } from "@/lib/utils";

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
  const userBook = await prisma.userBook.findUnique({
    where: { id },
    include: { book: true },
  });
  if (!userBook || userBook.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { page, pct } = parsed.data;
  const pageCount = userBook.book.pageCount ?? undefined;

  let synced: { page: number | null; pct: number | null };
  if (page !== undefined) {
    synced = syncProgress("page", page, pageCount);
  } else if (pct !== undefined) {
    synced = syncProgress("pct", pct, pageCount);
  } else {
    return NextResponse.json({ error: "Provide page or pct" }, { status: 400 });
  }

  // Log progress
  await prisma.progressLog.create({
    data: {
      userBookId: id,
      page: synced.page,
      pct: synced.pct,
    },
  });

  // Update current progress on UserBook
  const updated = await prisma.userBook.update({
    where: { id },
    data: {
      currentPage: synced.page,
      progressPct: synced.pct,
    },
    include: { book: true },
  });

  return NextResponse.json({ userBook: updated });
}
