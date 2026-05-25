import type { NormalizedBook } from "./google";

export async function searchOpenLibrary(query: string): Promise<NormalizedBook[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.docs?.map(normalizeOpenLibraryBook) ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOpenLibraryBook(doc: any): NormalizedBook {
  const coverId = doc.cover_i;
  return {
    googleBooksId: null,
    openLibraryId: doc.key ?? null,
    title: doc.title ?? "Unknown Title",
    authors: doc.author_name ?? [],
    coverUrl: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
      : null,
    isbn: doc.isbn?.[0] ?? null,
    description: null,
    genres: doc.subject?.slice(0, 5) ?? [],
    publishedDate: doc.first_publish_year?.toString() ?? null,
    pageCount: doc.number_of_pages_median ?? null,
    language: doc.language?.[0] ?? null,
  };
}
