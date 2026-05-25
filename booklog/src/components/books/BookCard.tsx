"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Plus, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { READING_STATUS_LABELS, type ReadingStatus } from "@/types";

interface BookCardProps {
  book: {
    id: string;
    title: string;
    authors: string[];
    coverUrl: string | null;
    publishedDate: string | null;
    pageCount: number | null;
    genres: string[];
  };
  userStatus?: ReadingStatus | null;
  onAdd?: (bookId: string) => void;
  isAdding?: boolean;
}

export function BookCard({ book, userStatus, onAdd, isAdding }: BookCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <Link href={`/books/${book.id}`} className="block">
        <div className="relative aspect-[2/3] bg-muted">
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 200px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-3 flex flex-col gap-1.5 flex-1">
        <Link href={`/books/${book.id}`} className="hover:underline">
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{book.title}</h3>
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {book.authors.join(", ") || "Unknown author"}
        </p>
        <div className="flex items-center gap-1 flex-wrap mt-auto pt-1">
          {book.genres[0] && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {book.genres[0]}
            </Badge>
          )}
          {book.pageCount && (
            <span className="text-xs text-muted-foreground">{book.pageCount} pp</span>
          )}
        </div>
        {onAdd && (
          <Button
            size="sm"
            variant={userStatus ? "outline" : "default"}
            className="w-full mt-1 text-xs h-7"
            onClick={() => onAdd(book.id)}
            disabled={isAdding || !!userStatus}
          >
            {userStatus ? (
              <>
                <Check className="h-3 w-3" />
                {READING_STATUS_LABELS[userStatus]}
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                Add to Library
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
