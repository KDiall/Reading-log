import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Users, CalendarDays, Target, User, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ChallengeActions } from "@/components/challenges/ChallengeActions";

const CHALLENGE_TYPE_LABELS: Record<string, string> = {
  BOOK_COUNT: "Book Count",
  PAGE_COUNT: "Page Count",
  GENRE_BINGO: "Genre Bingo",
  THEME_BASED: "Theme",
};

interface ChallengePageProps {
  params: Promise<{ id: string }>;
}

export default async function ChallengePage({ params }: ChallengePageProps) {
  const { id } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      _count: { select: { participants: true } },
      participants: {
        orderBy: { progress: "desc" },
        take: 20,
        include: {
          user: { select: { username: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!challenge) notFound();

  const session = await getSession();
  let userChallenge = null;
  if (session) {
    userChallenge = await prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId: session.userId, challengeId: id } },
    });
  }

  const now = new Date();
  const isActive = now >= challenge.startDate && now <= challenge.endDate;
  const isUpcoming = now < challenge.startDate;
  const statusLabel = isUpcoming ? "Upcoming" : isActive ? "Active" : "Ended";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/challenges" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> All Challenges
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant={isActive ? "default" : "outline"}>{statusLabel}</Badge>
            <Badge variant="secondary">{CHALLENGE_TYPE_LABELS[challenge.type]}</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">{challenge.title}</h1>
          {challenge.description && (
            <p className="text-muted-foreground">{challenge.description}</p>
          )}

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Target className="h-4 w-4" />
              Goal: <strong className="text-foreground">{challenge.targetValue}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDate(challenge.startDate)} — {formatDate(challenge.endDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {challenge._count.participants} participants
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          <ChallengeActions
            challengeId={challenge.id}
            isAuthenticated={!!session}
            initialJoined={!!userChallenge}
            initialProgress={userChallenge?.progress ?? 0}
            targetValue={challenge.targetValue}
            challengeType={challenge.type}
            isActive={isActive}
          />
        </div>
      </div>

      {/* Leaderboard */}
      <section>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5" /> Leaderboard
        </h2>
        {challenge.participants.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No participants yet. Be the first to join!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {challenge.participants.map((uc, idx) => {
              const pct = Math.min(100, (uc.progress / challenge.targetValue) * 100);
              return (
                <Card key={uc.id} className={uc.userId === session?.userId ? "border-primary/50" : ""}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                      {idx + 1}
                    </span>
                    <Link href={`/profile/${uc.user.username}`} className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                        {uc.user.avatarUrl ? (
                          <Image
                            src={uc.user.avatarUrl}
                            alt={uc.user.displayName}
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <Link href={`/profile/${uc.user.username}`} className="text-sm font-medium hover:underline">
                          {uc.user.displayName}
                        </Link>
                        <div className="flex items-center gap-2">
                          {uc.completedAt && (
                            <Badge className="text-xs py-0 h-5">✓ Done</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {uc.progress} / {challenge.targetValue}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
