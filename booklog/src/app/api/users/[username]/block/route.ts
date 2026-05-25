import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST — block a user
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.id === session.userId) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: session.userId, blockedId: target.id } },
    update: {},
    create: { blockerId: session.userId, blockedId: target.id },
  });

  // Soft-delete existing DMs between the two
  await prisma.message.updateMany({
    where: {
      context: "DIRECT",
      OR: [
        { senderId: session.userId, recipientId: target.id },
        { senderId: target.id, recipientId: session.userId },
      ],
    },
    data: { isDeleted: true },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — unblock
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.block.deleteMany({
    where: { blockerId: session.userId, blockedId: target.id },
  });

  return NextResponse.json({ ok: true });
}
