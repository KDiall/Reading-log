import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, MapPin, Star, Trophy, User, BarChart2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/reviews/StarRating";
import { StatusBadge } from "@/components/library/StatusBadge";
import { ReadingStatsCharts } from "@/components/profile/ReadingStatsCharts";
import { formatDate } from "@/lib/utils";
import type { ReadingStatus } from "@/types";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { displayName: true },
  });
  return {
    title: user ? `${user.displayName} (@${username}) — BookLog` : "Profile not found",
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      pronouns: true,
      location: true,
      avatarUrl: true,
      bannerUrl: true,
      accentColor: true,
      fontPreference: true,
      favoriteGenres: true,
      socialLinks: true,
      isPrivate: true,
      createdAt: true,
      _count: { select: { reviews: true, library: true } },
    },
  });

  if (!user) notFound();

  const session = await getSession();
  const isOwn = session?.userId === user.id;

  if (user.isPrivate && !isOwn) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <User className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <h1 className="text-xl font-semibold">{user.displayName}&apos;s profile is private</h1>
      </div>
    );
  }

  const [currentlyReading, recentlyFinished, activeReviews, challenges] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId: user.id, status: "CURRENTLY_READING" },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: { book: { select: { id: true, title: true, authors: true, coverUrl: true, pageCount: true } } },
    }),
    prisma.userBook.findMany({
      where: { userId: user.id, status: "FINISHED" },
      take: 5,
      orderBy: { finishDate: "desc" },
      include: {
        book: { select: { id: true, title: true, authors: true, coverUrl: true } },
      },
    }),
    prisma.review.findMany({
      where: { userId: user.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { book: { select: { id: true, title: true, coverUrl: true } } },
    }),
    prisma.userChallenge.findMany({
      where: { userId: user.id },
      take: 6,
      orderBy: { joinedAt: "desc" },
      include: { challenge: { select: { title: true, targetValue: true, type: true } } },
    }),
  ]);

  const finishedCount = await prisma.userBook.count({ where: { userId: user.id, status: "FINISHED" } });

  // Ratings for recently finished books
  const recentlyFinishedIds = recentlyFinished.map((ub) => ub.book.id);
  const ratingsForFinished = await prisma.review.findMany({
    where: { userId: user.id, bookId: { in: recentlyFinishedIds } },
    select: { bookId: true, rating: true },
  });
  const ratingMap = Object.fromEntries(ratingsForFinished.map((r) => [r.bookId, r.rating]));

  // Monthly reading stats (this year)
  const thisYear = new Date().getFullYear();
  const finishedThisYear = await prisma.userBook.findMany({
    where: { userId: user.id, status: "FINISHED", finishDate: { gte: new Date(`${thisYear}-01-01`) } },
    select: { finishDate: true, book: { select: { genres: true } } },
  });
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyCounts: Record<number, number> = {};
  const genreCounts: Record<string, number> = {};
  for (const ub of finishedThisYear) {
    if (ub.finishDate) {
      const m = new Date(ub.finishDate).getMonth();
      monthlyCounts[m] = (monthlyCounts[m] ?? 0) + 1;
    }
    for (const g of ub.book.genres) {
      genreCounts[g] = (genreCounts[g] ?? 0) + 1;
    }
  }
  const monthlyData = MONTHS.map((month, i) => ({ month, books: monthlyCounts[i] ?? 0 }));
  const genreData = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre, count]) => ({ genre, count }));
  const socialLinks = (user.socialLinks ?? {}) as Record<string, string>;

  return (
    <div
      className="min-h-screen"
      style={user.accentColor ? { ["--accent" as string]: user.accentColor } : {}}
    >
      {/* Banner */}
      <div className="relative h-36 md:h-48 bg-muted">
        {user.bannerUrl && (
          <Image src={user.bannerUrl} alt="Banner" fill className="object-cover" sizes="100vw" />
        )}
      </div>

      {/* Profile header */}
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-6">
          <div className="relative w-24 h-24 rounded-full border-4 border-background bg-muted overflow-hidden flex-shrink-0 shadow-md">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" sizes="96px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <User className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div>
                <h1 className="text-2xl font-bold">{user.displayName}</h1>
                <p className="text-muted-foreground text-sm">@{user.username}
                  {user.pronouns && <span className="ml-2 text-xs">· {user.pronouns}</span>}
                </p>
              </div>
              {isOwn && (
                <Link href="/settings" className="sm:ml-auto">
                  <Badge variant="outline" className="cursor-pointer">Edit profile</Badge>
                </Link>
              )}
            </div>
            {user.bio && <p className="text-sm mt-2 text-muted-foreground">{user.bio}</p>}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {user.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{user.location}</span>
              )}
              {Object.entries(socialLinks).map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground capitalize">{key}</a>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-6 border-b pb-4 mb-6 text-sm">
          <div className="text-center">
            <p className="font-bold text-lg">{finishedCount}</p>

            <p className="text-muted-foreground text-xs">Books read</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{user._count?.reviews ?? 0}</p>
            <p className="text-muted-foreground text-xs">Reviews</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{challenges.filter(c => c.completedAt).length}</p>
            <p className="text-muted-foreground text-xs">Challenges</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Currently reading */}
            {currentlyReading.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Currently Reading
                </h2>
                <div className="space-y-3">
                  {currentlyReading.map((ub) => (
                    <Link key={ub.id} href={`/books/${ub.book.id}`}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 flex gap-3 items-center">
                          <div className="relative w-10 h-14 rounded bg-muted overflow-hidden flex-shrink-0">
                            {ub.book.coverUrl ? (
                              <Image src={ub.book.coverUrl} alt={ub.book.title} fill className="object-cover" sizes="40px" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{ub.book.title}</p>
                            <p className="text-xs text-muted-foreground">{ub.book.authors[0]}</p>
                            <StatusBadge status={ub.status as ReadingStatus} />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recently finished */}
            {recentlyFinished.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4" /> Recently Finished
                </h2>
                <div className="space-y-3">
                  {recentlyFinished.map((ub) => {
                    const rating = ratingMap[ub.book.id] ?? null;
                    return (
                      <Link key={ub.id} href={`/books/${ub.book.id}`}>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-3 flex gap-3 items-center">
                            <div className="relative w-10 h-14 rounded bg-muted overflow-hidden flex-shrink-0">
                              {ub.book.coverUrl ? (
                                <Image src={ub.book.coverUrl} alt={ub.book.title} fill className="object-cover" sizes="40px" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm line-clamp-1">{ub.book.title}</p>
                              <p className="text-xs text-muted-foreground">{ub.book.authors[0]}</p>
                              {rating && <StarRating value={rating} readonly size="sm" />}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Reviews */}
            {activeReviews.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3">Recent Reviews</h2>
                <div className="space-y-3">
                  {activeReviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-3">
                        <Link href={`/books/${review.book.id}`} className="font-medium text-sm hover:underline">
                          {review.book.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating value={review.rating} readonly size="sm" />
                          <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                        </div>
                        {review.body && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {review.hasSpoiler ? "[Spoiler hidden]" : review.body}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Favourite genres */}
            {user.favoriteGenres.length > 0 && (
              <section>
                <h3 className="font-semibold text-sm mb-2">Favourite Genres</h3>
                <div className="flex flex-wrap gap-1.5">
                  {user.favoriteGenres.map((g) => (
                    <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Reading Stats */}
            {finishedThisYear.length > 0 && (
              <section>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" /> Reading Stats {thisYear}
                </h3>
                <ReadingStatsCharts monthlyData={monthlyData} genreData={genreData} />
              </section>
            )}

          {/* Challenges */}
            {challenges.length > 0 && (
              <section>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> Challenges
                </h3>
                <div className="space-y-2">
                  {challenges.map((uc) => (
                    <div key={uc.id} className="text-xs">
                      <p className="font-medium line-clamp-1">{uc.challenge.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, (uc.progress / uc.challenge.targetValue) * 100)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground">{uc.progress}/{uc.challenge.targetValue}</span>
                        {uc.completedAt && <Badge className="text-xs py-0 h-4">✓</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="text-xs text-muted-foreground">
              Member since {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
