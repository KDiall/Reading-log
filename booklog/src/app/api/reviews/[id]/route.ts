import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional().nullable(),
  body: z.string().max(10000).optional().nullable(),
  hasSpoiler: z.boolean().optional(),
  format: z.enum(["EBOOK", "AUDIOBOOK"]).optional(),
  dateRead: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  const updated = await prisma.review.update({
    where: { id },
    data: {
      ...data,
      dateRead: data.dateRead ? new Date(data.dateRead) : data.dateRead === null ? null : undefined,
    },
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ review: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
