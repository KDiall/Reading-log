import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const format = searchParams.get("format");
  const sort = searchParams.get("sort") ?? "dateAdded";
  const order = searchParams.get("order") ?? "desc";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId: session.userId };
  if (status) where.status = status;
  if (format) where.format = format;

  const orderBy =
    sort === "title"
      ? { book: { title: order as "asc" | "desc" } }
      : sort === "progress"
      ? { progressPct: order as "asc" | "desc" }
      : { [sort]: order };

  const library = await prisma.userBook.findMany({
    where,
    orderBy,
    include: { book: true },
  });

  return NextResponse.json({ library });
}

const addSchema = z.object({
  bookId: z.string(),
  status: z.enum(["WANT_TO_READ", "CURRENTLY_READING", "FINISHED", "DNF", "RE_READING"]),
  format: z.enum(["EBOOK", "AUDIOBOOK"]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { bookId, status, format } = parsed.data;

  const existing = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId: session.userId, bookId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Book already in library" }, { status: 409 });
  }

  const userBook = await prisma.userBook.create({
    data: {
      userId: session.userId,
      bookId,
      status,
      format,
      startDate: status === "CURRENTLY_READING" ? new Date() : null,
      finishDate: status === "FINISHED" ? new Date() : null,
    },
    include: { book: true },
  });

  return NextResponse.json({ userBook }, { status: 201 });
}
