import { notFound } from "next/navigation";
import Image from "next/image";
import { BookOpen, CalendarDays, FileText, Hash } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { AddToLibraryButton } from "@/components/books/AddToLibraryButton";
import { BookReviewsSection } from "@/components/reviews/BookReviewsSection";

interface BookPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;

  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { username: true, displayName: true, avatarUrl: true } },
        },
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!book) notFound();

  const session = await getSession();
  let userBook = null;
  let userReview = null;
  if (session) {
    [userBook, userReview] = await Promise.all([
      prisma.userBook.findUnique({
        where: { userId_bookId: { userId: session.userId, bookId: id } },
        select: { status: true },
      }),
      prisma.review.findUnique({
        where: { userId_bookId: { userId: session.userId, bookId: id } },
      }),
    ]);
  }

  const avgRating =
    book.reviews.length > 0
      ? (book.reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / book.reviews.length).toFixed(1)
      : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <div className="flex-shrink-0">
          <div className="relative w-40 h-60 md:w-48 md:h-72 rounded-lg overflow-hidden bg-muted shadow-md">
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt={`Cover of ${book.title}`}
                fill
                className="object-cover"
                sizes="192px"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <div className="mt-4">
            <AddToLibraryButton bookId={book.id} initialStatus={userBook?.status ?? null} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold leading-tight">{book.title}</h1>
          <p className="text-lg text-muted-foreground mt-1">
            {book.authors.join(", ") || "Unknown author"}
          </p>

          <div className="flex flex-wrap gap-3 mt-4 text-sm text-muted-foreground">
            {avgRating && (
              <span className="flex items-center gap-1">
                ★ <strong className="text-foreground">{avgRating}</strong>
                <span>({book._count.reviews} reviews)</span>
              </span>
            )}
            {book.pageCount && (
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {book.pageCount} pages
              </span>
            )}
            {book.publishedDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {book.publishedDate}
              </span>
            )}
            {book.isbn && (
              <span className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                {book.isbn}
              </span>
            )}
          </div>

          {book.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {book.genres.map((g: string) => (
                <Badge key={g} variant="secondary">{g}</Badge>
              ))}
            </div>
          )}

          {book.description && (
            <div className="mt-5">
              <h2 className="font-semibold mb-2">About this book</h2>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                {book.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Full reviews section — client component */}
      <BookReviewsSection
        bookId={book.id}
        initialReviews={book.reviews}
        totalReviews={book._count.reviews}
        isAuthenticated={!!session}
        userReviewId={userReview?.id ?? null}
      />
    </div>
  );
}
