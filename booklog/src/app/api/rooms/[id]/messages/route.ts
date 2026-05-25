import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = 40;

  const messages = await prisma.message.findMany({
    where: { roomId: id, context: "ROOM", isDeleted: false },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;
  return NextResponse.json({ messages: messages.reverse(), nextCursor });
}

const sendSchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const room = await prisma.readingRoom.findUnique({ where: { id } });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Chat locked during ACTIVE unless participant has shareProgress
  if (room.status === "ACTIVE" && room.chatLocked) {
    return NextResponse.json({ error: "Chat is locked during reading" }, { status: 403 });
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId: id, userId: session.userId } },
  });
  if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const message = await prisma.message.create({
    data: {
      senderId: session.userId,
      context: "ROOM",
      roomId: id,
      body: parsed.data.body,
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  await pusherServer.trigger(`private-room-${id}`, "room:message", {
    id: message.id,
    senderId: message.senderId,
    sender: message.sender,
    body: message.body,
    createdAt: message.createdAt,
  });

  return NextResponse.json({ message }, { status: 201 });
}
