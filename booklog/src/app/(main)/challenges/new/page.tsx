"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface FormValues {
  title: string;
  description: string;
  type: "BOOK_COUNT" | "PAGE_COUNT" | "GENRE_BINGO" | "THEME_BASED";
  targetValue: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
}

const TYPE_OPTIONS = [
  { value: "BOOK_COUNT", label: "Book Count", hint: "Read X books within the time period" },
  { value: "PAGE_COUNT", label: "Page Count", hint: "Read X pages within the time period" },
  { value: "GENRE_BINGO", label: "Genre Bingo", hint: "Read books across X different genres" },
  { value: "THEME_BASED", label: "Theme Based", hint: "Read X books matching a theme" },
];

export default function NewChallengePage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      defaultValues: { type: "BOOK_COUNT", isPublic: true, targetValue: "12", title: "", description: "", startDate: "", endDate: "" },
    });

  const selectedType = watch("type");
  const isPublic = watch("isPublic");

  async function onSubmit(values: FormValues) {
    setFormError(null);
    if (!values.title.trim() || values.title.length < 3) {
      setError("title", { message: "At least 3 characters" }); return;
    }
    const targetNum = parseInt(values.targetValue, 10);
    if (isNaN(targetNum) || targetNum < 1) {
      setError("targetValue", { message: "Must be at least 1" }); return;
    }
    if (!values.startDate) { setError("startDate", { message: "Required" }); return; }
    if (!values.endDate) { setError("endDate", { message: "Required" }); return; }
    const payload = { ...values, targetValue: targetNum };
    const res = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error ?? "Failed to create challenge"); return; }
    router.push(`/challenges/${data.challenge.id}`);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Trophy className="h-6 w-6" /> Create a Challenge
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader className="pb-2 font-semibold text-sm">Basic Info</CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="e.g. Read 24 Books in 2026" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="What's this challenge about?"
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 font-semibold text-sm">Challenge Type</CardHeader>
          <CardContent className="space-y-2">
            {TYPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedType === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  checked={selectedType === opt.value}
                  onChange={() => setValue("type", opt.value as FormValues["type"])}
                />
                <div>
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.hint}</p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 font-semibold text-sm">Goal & Dates</CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="targetValue">
                Target{" "}
                <span className="text-muted-foreground font-normal text-xs">
                  ({selectedType === "PAGE_COUNT" ? "pages" : "books / items"})
                </span>
              </Label>
              <Input id="targetValue" type="number" min={1} {...register("targetValue")} />
              {errors.targetValue && <p className="text-xs text-destructive">{errors.targetValue.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input id="startDate" type="date" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">End Date *</Label>
                <Input id="endDate" type="date" {...register("endDate")} />
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setValue("isPublic", e.target.checked)}
                className="rounded"
              />
              <div>
                <p className="font-medium text-sm">Public challenge</p>
                <p className="text-xs text-muted-foreground">Anyone can find and join this challenge</p>
              </div>
            </label>
          </CardContent>
        </Card>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Create Challenge
        </Button>
      </form>
    </div>
  );
}
