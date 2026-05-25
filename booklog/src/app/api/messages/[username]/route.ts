import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const partner = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  if (!partner) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = 40;

  const messages = await prisma.message.findMany({
    where: {
      context: "DIRECT",
      isDeleted: false,
      OR: [
        { senderId: session.userId, recipientId: partner.id },
        { senderId: partner.id, recipientId: session.userId },
      ],
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  // Mark unread messages from partner as read
  await prisma.message.updateMany({
    where: {
      context: "DIRECT",
      senderId: partner.id,
      recipientId: session.userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;
  return NextResponse.json({ messages: messages.reverse(), partner, nextCursor });
}

const sendSchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const partner = await prisma.user.findUnique({ where: { username } });
  if (!partner) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (partner.id === session.userId) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  // Check block in either direction
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: session.userId, blockedId: partner.id },
        { blockerId: partner.id, blockedId: session.userId },
      ],
    },
  });
  if (block) return NextResponse.json({ error: "Cannot send message" }, { status: 403 });

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const message = await prisma.message.create({
    data: {
      senderId: session.userId,
      recipientId: partner.id,
      context: "DIRECT",
      body: parsed.data.body,
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  await pusherServer.trigger(`private-dm-${partner.id}`, "dm:new-message", {
    messageId: message.id,
    senderId: session.userId,
    preview: message.body.slice(0, 60),
  });

  return NextResponse.json({ message }, { status: 201 });
}
