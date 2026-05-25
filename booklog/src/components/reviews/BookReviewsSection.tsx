"use client";

import { useState } from "react";
import { PenLine, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";

type ReviewUser = { username: string; displayName: string; avatarUrl: string | null };

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  hasSpoiler: boolean;
  format: "EBOOK" | "AUDIOBOOK";
  dateRead: string | Date | null;
  likesCount: number;
  createdAt: string | Date;
  user: ReviewUser;
  userId: string;
}

interface BookReviewsSectionProps {
  bookId: string;
  initialReviews: Review[];
  totalReviews: number;
  isAuthenticated: boolean;
  userReviewId: string | null;
}

const SORT_OPTIONS = [
  { label: "Most Recent", value: "recent" },
  { label: "Most Liked", value: "liked" },
  { label: "Highest", value: "highest" },
  { label: "Lowest", value: "lowest" },
];

export function BookReviewsSection({
  bookId,
  initialReviews,
  totalReviews,
  isAuthenticated,
  userReviewId,
}: BookReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [sort, setSort] = useState("recent");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchReviews(newSort: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/reviews?sort=${newSort}`);
      const data = await res.json();
      setReviews(data.reviews ?? []);
    } finally {
      setLoading(false);
    }
  }

  function handleSortChange(value: string) {
    setSort(value);
    fetchReviews(value);
  }

  function handleNewReview(review: unknown) {
    setReviews((prev) => [review as Review, ...prev]);
    setShowForm(false);
  }

  function handleEditReview(updated: unknown) {
    setReviews((prev) =>
      prev.map((r) => (r.id === (updated as Review).id ? (updated as Review) : r))
    );
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (res.ok) setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  const myReview = reviews.find((r) => r.id === userReviewId);
  const canWriteReview = isAuthenticated && !userReviewId && !showForm;

  return (
    <section className="mt-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Community Reviews
          {totalReviews > 0 && (
            <span className="text-base font-normal text-muted-foreground">({totalReviews})</span>
          )}
        </h2>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort controls */}
          <div className="flex items-center gap-1.5 text-sm">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => handleSortChange(o.value)}
                className={`px-2 py-1 rounded transition-colors ${
                  sort === o.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {canWriteReview && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <PenLine className="h-4 w-4 mr-1.5" />
              Write a review
            </Button>
          )}
        </div>
      </div>

      {/* Write review form */}
      {showForm && (
        <div className="mb-6 border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Your Review</h3>
          <ReviewForm
            bookId={bookId}
            onSuccess={handleNewReview}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {reviews.length === 0 && !showForm && (
        <div className="text-center py-10 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No reviews yet. {isAuthenticated ? "Be the first!" : "Sign in to write one."}</p>
        </div>
      )}

      <div className={`space-y-4 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        {reviews.map((review) => (
          editingId === review.id ? (
            <div key={review.id} className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Edit Review</h3>
              <ReviewForm
                bookId={bookId}
                initialValues={{
                  id: review.id,
                  rating: review.rating,
                  title: review.title ?? undefined,
                  body: review.body ?? undefined,
                  hasSpoiler: review.hasSpoiler,
                  format: review.format,
                }}
                onSuccess={handleEditReview}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <ReviewCard
              key={review.id}
              review={review}
              isOwn={review.id === userReviewId}
              onEdit={(id) => setEditingId(id)}
              onDelete={handleDelete}
            />
          )
        ))}
      </div>

      {/* My review pinned at bottom if not in list */}
      {myReview && !reviews.find((r) => r.id === myReview.id) && (
        <div className="mt-4 border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2">Your review</p>
          <ReviewCard
            review={myReview}
            isOwn
            onEdit={(id) => setEditingId(id)}
            onDelete={handleDelete}
          />
        </div>
      )}
    </section>
  );
}
