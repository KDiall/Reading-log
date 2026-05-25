import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchGoogleBooks } from "@/lib/books/google";
import { searchOpenLibrary } from "@/lib/books/openlibrary";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Check Neon cache first
  const cached = await prisma.book.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    take: 10,
  });
  if (cached.length >= 3) return NextResponse.json({ results: cached });

  // Fetch from Google Books, fallback to Open Library
  let results = await searchGoogleBooks(q);
  if (results.length === 0) results = await searchOpenLibrary(q);

  // Upsert into Neon cache
  const upserted = await Promise.all(
    results.map(async (book) => {
      try {
        return await prisma.book.upsert({
          where: { googleBooksId: book.googleBooksId ?? "__none__" },
          update: {},
          create: {
            googleBooksId: book.googleBooksId,
            openLibraryId: book.openLibraryId,
            title: book.title,
            authors: book.authors,
            coverUrl: book.coverUrl,
            isbn: book.isbn,
            description: book.description,
            genres: book.genres,
            publishedDate: book.publishedDate,
            pageCount: book.pageCount,
            language: book.language,
          },
        });
      } catch {
        return null;
      }
    })
  );

  return NextResponse.json({ results: upserted.filter(Boolean) });
}
