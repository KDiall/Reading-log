"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, User, EyeOff, Eye, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { formatDate } from "@/lib/utils";
import { BOOK_FORMAT_LABELS, type BookFormat } from "@/types";

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    hasSpoiler: boolean;
    format: BookFormat;
    dateRead: string | Date | null;
    likesCount: number;
    createdAt: string | Date;
    user: {
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
  isOwn?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ReviewCard({ review, isOwn, onEdit, onDelete }: ReviewCardProps) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [likes, setLikes] = useState(review.likesCount);
  const [liked, setLiked] = useState(false);

  async function handleLike() {
    if (liked) return;
    await fetch(`/api/reviews/${review.id}/like`, { method: "POST" });
    setLikes((l) => l + 1);
    setLiked(true);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link href={`/profile/${review.user.username}`} className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                {review.user.avatarUrl ? (
                  <Image
                    src={review.user.avatarUrl}
                    alt={review.user.displayName}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </Link>
            <div className="min-w-0">
              <Link href={`/profile/${review.user.username}`} className="hover:underline">
                <span className="font-medium text-sm">{review.user.displayName}</span>
              </Link>
              <span className="text-xs text-muted-foreground ml-1.5">
                @{review.user.username}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isOwn && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit?.(review.id)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete?.(review.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Rating + meta */}
        <div className="flex flex-wrap items-center gap-2">
          <StarRating value={review.rating} readonly size="sm" />
          <Badge variant="outline" className="text-xs">
            {BOOK_FORMAT_LABELS[review.format]}
          </Badge>
          {review.dateRead && (
            <span className="text-xs text-muted-foreground">
              Read {formatDate(review.dateRead)}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDate(review.createdAt)}
          </span>
        </div>

        {/* Title */}
        {review.title && (
          <p className="font-semibold text-sm">{review.title}</p>
        )}

        {/* Body / spoiler */}
        {review.body && (
          <div>
            {review.hasSpoiler && !spoilerRevealed ? (
              <button
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSpoilerRevealed(true)}
              >
                <EyeOff className="h-4 w-4" />
                Contains spoilers — click to reveal
              </button>
            ) : (
              <div className="relative">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {review.body}
                </p>
                {review.hasSpoiler && (
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground mt-1 hover:text-foreground"
                    onClick={() => setSpoilerRevealed(false)}
                  >
                    <Eye className="h-3 w-3" /> Hide spoilers
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Like */}
        <div className="flex items-center gap-1 pt-1 border-t">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 gap-1.5 text-xs ${liked ? "text-rose-500" : ""}`}
            onClick={handleLike}
            disabled={liked}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
            {likes}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
