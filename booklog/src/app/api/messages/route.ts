import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/messages — inbox: one entry per conversation partner, most recent first
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find all DM messages involving this user
  const messages = await prisma.message.findMany({
    where: {
      context: "DIRECT",
      isDeleted: false,
      OR: [
        { senderId: session.userId },
        { recipientId: session.userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  // Deduplicate to one entry per conversation partner
  const seen = new Set<string>();
  const conversations: typeof messages = [];
  for (const m of messages) {
    const partnerId = m.senderId === session.userId ? m.recipientId! : m.senderId;
    if (!seen.has(partnerId)) {
      seen.add(partnerId);
      conversations.push(m);
    }
  }

  // Get partner user info
  const partnerIds = conversations.map((m) =>
    m.senderId === session.userId ? m.recipientId! : m.senderId
  );
  const partners = await prisma.user.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  const partnerMap = Object.fromEntries(partners.map((p) => [p.id, p]));

  // Unread counts per partner
  const unreadCounts = await prisma.message.groupBy({
    by: ["senderId"],
    where: {
      context: "DIRECT",
      recipientId: session.userId,
      readAt: null,
      isDeleted: false,
    },
    _count: { id: true },
  });
  const unreadMap = Object.fromEntries(unreadCounts.map((u) => [u.senderId, u._count.id]));

  const inbox = conversations.map((m) => {
    const partnerId = m.senderId === session.userId ? m.recipientId! : m.senderId;
    return {
      partner: partnerMap[partnerId],
      lastMessage: { body: m.body, createdAt: m.createdAt, isOwn: m.senderId === session.userId },
      unread: unreadMap[partnerId] ?? 0,
    };
  });

  return NextResponse.json({ inbox });
}
