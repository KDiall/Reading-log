import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Simple increment toggle — in a real app you'd track per-user likes in a separate table
  const updated = await prisma.review.update({
    where: { id },
    data: { likesCount: { increment: 1 } },
  });

  return NextResponse.json({ likesCount: updated.likesCount });
}
