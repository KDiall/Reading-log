export interface NormalizedBook {
  googleBooksId: string | null;
  openLibraryId: string | null;
  title: string;
  authors: string[];
  coverUrl: string | null;
  isbn: string | null;
  description: string | null;
  genres: string[];
  publishedDate: string | null;
  pageCount: number | null;
  language: string | null;
}

export async function searchGoogleBooks(query: string): Promise<NormalizedBook[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${process.env.GOOGLE_BOOKS_API_KEY}&maxResults=10`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items?.map(normalizeGoogleBook) ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGoogleBook(item: any): NormalizedBook {
  const v = item.volumeInfo;
  return {
    googleBooksId: item.id ?? null,
    openLibraryId: null,
    title: v.title ?? "Unknown Title",
    authors: v.authors ?? [],
    coverUrl: v.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
    isbn:
      v.industryIdentifiers?.find((i: { type: string }) => i.type === "ISBN_13")
        ?.identifier ?? null,
    description: v.description ?? null,
    genres: v.categories ?? [],
    publishedDate: v.publishedDate ?? null,
    pageCount: v.pageCount ?? null,
    language: v.language ?? null,
  };
}
