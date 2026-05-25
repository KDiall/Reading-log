import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/messages/[username]/read — mark all from this sender as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const sender = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!sender) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.message.updateMany({
    where: {
      context: "DIRECT",
      senderId: sender.id,
      recipientId: session.userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
