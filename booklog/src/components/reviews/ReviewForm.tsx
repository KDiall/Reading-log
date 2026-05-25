"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "./StarRating";

const schema = z.object({
  rating: z.number().int().min(1, "Please select a rating").max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(10000).optional(),
  hasSpoiler: z.boolean(),
  format: z.enum(["EBOOK", "AUDIOBOOK"]),
  dateRead: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ReviewFormProps {
  bookId: string;
  initialValues?: Partial<FormValues> & { id?: string };
  onSuccess: (review: unknown) => void;
  onCancel: () => void;
}

export function ReviewForm({ bookId, initialValues, onSuccess, onCancel }: ReviewFormProps) {
  const isEdit = !!initialValues?.id;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rating: initialValues?.rating ?? 0,
      title: initialValues?.title ?? "",
      body: initialValues?.body ?? "",
      hasSpoiler: initialValues?.hasSpoiler ?? false,
      format: initialValues?.format ?? "EBOOK",
      dateRead: initialValues?.dateRead ?? "",
    },
  });

  const rating = watch("rating");
  const hasSpoiler = watch("hasSpoiler");

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const url = isEdit
        ? `/api/reviews/${initialValues!.id}`
        : `/api/books/${bookId}/reviews`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      onSuccess(data.review);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Star rating */}
      <div className="space-y-1">
        <Label>Rating *</Label>
        <StarRating value={rating} onChange={(v) => setValue("rating", v)} size="lg" />
        {errors.rating && (
          <p className="text-xs text-destructive">{errors.rating.message}</p>
        )}
      </div>

      {/* Format */}
      <div className="space-y-1">
        <Label htmlFor="format">Format *</Label>
        <select
          id="format"
          {...register("format")}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="EBOOK">eBook</option>
          <option value="AUDIOBOOK">Audiobook</option>
        </select>
      </div>

      {/* Date read */}
      <div className="space-y-1">
        <Label htmlFor="dateRead">Date read</Label>
        <Input id="dateRead" type="date" {...register("dateRead")} />
      </div>

      {/* Review title */}
      <div className="space-y-1">
        <Label htmlFor="title">Review title</Label>
        <Input id="title" placeholder="Optional headline…" {...register("title")} />
      </div>

      {/* Body */}
      <div className="space-y-1">
        <Label htmlFor="body">Review</Label>
        <textarea
          id="body"
          rows={5}
          placeholder="Share your thoughts…"
          className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          {...register("body")}
        />
      </div>

      {/* Spoiler toggle */}
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={hasSpoiler}
          onChange={(e) => setValue("hasSpoiler", e.target.checked)}
          className="rounded"
        />
        This review contains spoilers
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isEdit ? "Save changes" : "Post review"}
        </Button>
      </div>
    </form>
  );
}
