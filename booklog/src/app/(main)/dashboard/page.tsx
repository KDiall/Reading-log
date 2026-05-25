import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Library, Search, TrendingUp, Trophy, Activity } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/library/ProgressBar";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true },
  });

  const currentlyReading = await prisma.userBook.findMany({
    where: { userId: session.userId, status: "CURRENTLY_READING" },
    take: 3,
    orderBy: { updatedAt: "desc" },
    include: { book: true },
  });

  const wantToRead = await prisma.userBook.findMany({
    where: { userId: session.userId, status: "WANT_TO_READ" },
    take: 5,
    orderBy: { dateAdded: "desc" },
    include: { book: true },
  });

  const thisYear = new Date().getFullYear();
  const booksFinishedThisYear = await prisma.userBook.count({
    where: {
      userId: session.userId,
      status: "FINISHED",
      finishDate: {
        gte: new Date(`${thisYear}-01-01`),
        lte: new Date(`${thisYear}-12-31`),
      },
    },
  });

  const totalPagesRead = await prisma.userBook.findMany({
    where: { userId: session.userId, status: "FINISHED" },
    include: { book: { select: { pageCount: true } } },
  });
  const totalPages = totalPagesRead.reduce(
    (sum: number, ub: { book: { pageCount: number | null } }) => sum + (ub.book.pageCount ?? 0),
    0
  );

  const recentActivity = await prisma.userBook.findMany({
    where: { userId: session.userId },
    take: 8,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      currentPage: true,
      progressPct: true,
      book: { select: { id: true, title: true, authors: true } },
    },
  });

  const activeChallenges = await prisma.userChallenge.findMany({
    where: {
      userId: session.userId,
      completedAt: null,
      challenge: { endDate: { gte: new Date() } },
    },
    take: 4,
    orderBy: { joinedAt: "desc" },
    include: { challenge: { select: { title: true, targetValue: true, type: true, endDate: true } } },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">
        Hello, {user?.displayName ?? "Reader"} 👋
      </h1>
      <p className="text-muted-foreground mb-8">Here&apos;s your reading overview</p>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Books this year</p>
            <p className="text-2xl font-bold mt-0.5">{booksFinishedThisYear}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total pages read</p>
            <p className="text-2xl font-bold mt-0.5">{totalPages.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Currently reading</p>
            <p className="text-2xl font-bold mt-0.5">{currentlyReading.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active challenges</p>
            <p className="text-2xl font-bold mt-0.5">{activeChallenges.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Currently Reading */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Currently Reading
          </h2>
          <Link href="/library?status=CURRENTLY_READING">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </div>

        {currentlyReading.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>You&apos;re not reading anything right now.</p>
              <Link href="/search">
                <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                  <Search className="h-4 w-4" />
                  Find a book
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentlyReading.map((ub: typeof currentlyReading[number]) => (
              <Card key={ub.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex gap-3 p-3">
                  <Link href={`/books/${ub.book.id}`} className="flex-shrink-0">
                    <div className="relative w-12 h-18 rounded bg-muted overflow-hidden" style={{ height: "4.5rem" }}>
                      {ub.book.coverUrl ? (
                        <Image
                          src={ub.book.coverUrl}
                          alt={ub.book.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-0 flex-1 min-w-0">
                    <Link href={`/books/${ub.book.id}`}>
                      <h3 className="font-semibold text-sm line-clamp-2 leading-tight hover:underline">
                        {ub.book.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ub.book.authors[0]}
                    </p>
                    <div className="mt-2">
                      <ProgressBar
                        currentPage={ub.currentPage}
                        progressPct={ub.progressPct}
                        pageCount={ub.book.pageCount}
                      />
                    </div>
                    {ub.startDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Started {formatDate(ub.startDate)}
                      </p>
                    )}
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Want to Read shelf */}
      {wantToRead.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Up Next
            </h2>
            <Link href="/library?status=WANT_TO_READ">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {wantToRead.map((ub: typeof wantToRead[number]) => (
              <Link key={ub.id} href={`/books/${ub.book.id}`} className="group">
                <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-muted">
                  {ub.book.coverUrl ? (
                    <Image
                      src={ub.book.coverUrl}
                      alt={ub.book.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 640px) 50vw, 120px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium mt-1 line-clamp-2 group-hover:underline">
                  {ub.book.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Active Challenges
            </h2>
            <Link href="/challenges">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeChallenges.map((uc) => {
              const pct = Math.min(100, (uc.progress / uc.challenge.targetValue) * 100);
              const circ = 2 * Math.PI * 20;
              return (
                <Link key={uc.id} href={`/challenges/${uc.challengeId}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <svg width={48} height={48} className="-rotate-90">
                          <circle cx={24} cy={24} r={20} fill="none" stroke="currentColor" strokeWidth={4} className="text-muted/30" />
                          <circle cx={24} cy={24} r={20} fill="none" stroke="currentColor" strokeWidth={4}
                            strokeDasharray={circ}
                            strokeDashoffset={circ - (pct / 100) * circ}
                            strokeLinecap="round" className="text-primary" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ transform: "rotate(90deg)" }}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{uc.challenge.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {uc.progress} / {uc.challenge.targetValue}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ends {new Date(uc.challenge.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5" /> Recent Activity
          </h2>
          <div className="space-y-2">
            {recentActivity.map((ub) => (
              <div key={ub.id} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <Link href={`/books/${ub.book.id}`} className="font-medium hover:underline line-clamp-1">
                    {ub.book.title}
                  </Link>
                </span>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {ub.status === "CURRENTLY_READING" ? "Reading" :
                   ub.status === "FINISHED" ? "Finished" :
                   ub.status === "WANT_TO_READ" ? "Want to read" :
                   ub.status === "DNF" ? "DNF" : "Re-reading"}
                </Badge>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDate(ub.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick links */}
      <section>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <Library className="h-5 w-5" />
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/search">
            <Button variant="outline" className="gap-1.5">
              <Search className="h-4 w-4" />
              Search Books
            </Button>
          </Link>
          <Link href="/library">
            <Button variant="outline" className="gap-1.5">
              <Library className="h-4 w-4" />
              My Library
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
