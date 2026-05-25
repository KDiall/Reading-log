"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { formatDate } from "@/lib/utils";
import type { ReadingStatus, BookFormat } from "@/types";
import { BOOK_FORMAT_LABELS } from "@/types";

interface UserBookCardProps {
  userBook: {
    id: string;
    status: ReadingStatus;
    format: BookFormat;
    currentPage: number | null;
    progressPct: number | null;
    startDate: string | Date | null;
    finishDate: string | Date | null;
    book: {
      id: string;
      title: string;
      authors: string[];
      coverUrl: string | null;
      pageCount: number | null;
    };
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function UserBookCard({ userBook, onEdit, onDelete }: UserBookCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-3 p-3">
        <Link href={`/books/${userBook.book.id}`} className="flex-shrink-0">
          <div className="relative w-14 h-20 rounded bg-muted overflow-hidden">
            {userBook.book.coverUrl ? (
              <Image
                src={userBook.book.coverUrl}
                alt={userBook.book.title}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-muted-foreground/40" />
              </div>
            )}
          </div>
        </Link>

        <CardContent className="p-0 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/books/${userBook.book.id}`} className="hover:underline">
                <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                  {userBook.book.title}
                </h3>
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {userBook.book.authors.join(", ")}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(userBook.id)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(userBook.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={userBook.status} />
            <span className="text-xs text-muted-foreground">
              {BOOK_FORMAT_LABELS[userBook.format]}
            </span>
          </div>

          {userBook.status === "CURRENTLY_READING" && (
            <div className="mt-2">
              <ProgressBar
                currentPage={userBook.currentPage}
                progressPct={userBook.progressPct}
                pageCount={userBook.book.pageCount}
              />
            </div>
          )}

          <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
            {userBook.startDate && (
              <span>Started {formatDate(userBook.startDate)}</span>
            )}
            {userBook.finishDate && (
              <span>Finished {formatDate(userBook.finishDate)}</span>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
