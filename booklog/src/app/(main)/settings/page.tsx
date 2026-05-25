"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload, User, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const FONT_OPTIONS = [
  { value: "inter", label: "Inter (default)" },
  { value: "lora", label: "Lora (serif)" },
  { value: "playfair", label: "Playfair Display" },
  { value: "dm-sans", label: "DM Sans" },
  { value: "jetbrains", label: "JetBrains Mono" },
];

const GENRES = [
  "Fantasy", "Science Fiction", "Mystery", "Thriller", "Romance",
  "Horror", "Historical Fiction", "Literary Fiction", "Non-Fiction",
  "Biography", "Self-Help", "Young Adult", "Children", "Poetry",
  "Graphic Novel", "True Crime",
];

const schema = z.object({
  displayName: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  pronouns: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}/).optional().or(z.literal("")),
  fontPreference: z.enum(["inter", "lora", "playfair", "dm-sans", "jetbrains"]).optional(),
  isPrivate: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [socialLinks, setSocialLinks] = useState<{ label: string; url: string }[]>([]);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", bio: "", pronouns: "", location: "", accentColor: "", isPrivate: false },
  });

  const accentColor = watch("accentColor");
  const isPrivate = watch("isPrivate");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/profile");
        const data = await res.json();
        if (data.user) {
          reset({
            displayName: data.user.displayName ?? "",
            bio: data.user.bio ?? "",
            pronouns: data.user.pronouns ?? "",
            location: data.user.location ?? "",
            accentColor: data.user.accentColor ?? "",
            fontPreference: data.user.fontPreference ?? undefined,
            isPrivate: data.user.isPrivate ?? false,
          });
          setAvatarUrl(data.user.avatarUrl);
          setBannerUrl(data.user.bannerUrl);
          setSelectedGenres(data.user.favoriteGenres ?? []);
          // socialLinks stored as { label: url } object — convert to array
          const sl = data.user.socialLinks ?? {};
          setSocialLinks(Object.entries(sl).map(([label, url]) => ({ label, url: url as string })));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reset]);

  async function uploadFile(file: File, type: "avatar" | "banner") {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadFile(file, "avatar");
      setAvatarUrl(url);
      await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const url = await uploadFile(file, "banner");
      setBannerUrl(url);
      await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerUrl: url }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingBanner(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const slObj = Object.fromEntries(socialLinks.filter(s => s.label && s.url).map(s => [s.label, s.url]));
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, favoriteGenres: selectedGenres, socialLinks: slObj }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Avatar + Banner */}
        <Card>
          <CardHeader className="pb-2 font-semibold">Profile Images</CardHeader>
          <CardContent className="space-y-4">
            {/* Banner */}
            <div>
              <Label className="mb-2 block">Banner Image</Label>
              <div
                className="relative h-28 rounded-lg bg-muted overflow-hidden cursor-pointer group"
                onClick={() => bannerRef.current?.click()}
              >
                {bannerUrl && (
                  <Image src={bannerUrl} alt="Banner" fill className="object-cover" sizes="100vw" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingBanner ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Upload className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>
              <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div
                className="relative w-20 h-20 rounded-full bg-muted overflow-hidden cursor-pointer group flex-shrink-0"
                onClick={() => avatarRef.current?.click()}
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Upload className="h-5 w-5 text-white" />
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Profile photo</p>
                <p>Click to upload · Max 5 MB · JPG, PNG, WebP</p>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </CardContent>
        </Card>

        {/* Basic info */}
        <Card>
          <CardHeader className="pb-2 font-semibold">Basic Info</CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input id="displayName" {...register("displayName")} />
              {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Tell readers about yourself…"
                {...register("bio")}
              />
              {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="pronouns">Pronouns</Label>
                <Input id="pronouns" placeholder="e.g. she/her" {...register("pronouns")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="City, Country" {...register("location")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customization */}
        <Card>
          <CardHeader className="pb-2 font-semibold">Profile Customization</CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="accentColor">Accent Color</Label>
                <Input id="accentColor" placeholder="#6366f1" {...register("accentColor")} />
                {errors.accentColor && <p className="text-xs text-destructive">Must be a valid hex color</p>}
              </div>
              {accentColor && /^#[0-9a-fA-F]{6}/.test(accentColor) && (
                <div
                  className="w-10 h-10 rounded-full border mt-5 flex-shrink-0"
                  style={{ background: accentColor }}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="fontPreference">Font</Label>
              <select
                id="fontPreference"
                {...register("fontPreference")}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Default</option>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Favourite genres */}
        <Card>
          <CardHeader className="pb-2 font-semibold">Favourite Genres</CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    selectedGenres.includes(genre)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Social links */}
        <Card>
          <CardHeader className="pb-2 font-semibold">Social Links <span className="text-xs font-normal text-muted-foreground">(up to 3)</span></CardHeader>
          <CardContent className="space-y-2">
            {socialLinks.map((link, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder="Label (e.g. twitter)"
                  value={link.label}
                  onChange={(e) => setSocialLinks(prev => prev.map((s, j) => j === i ? { ...s, label: e.target.value } : s))}
                  className="w-28 text-sm h-8"
                />
                <Input
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => setSocialLinks(prev => prev.map((s, j) => j === i ? { ...s, url: e.target.value } : s))}
                  className="flex-1 text-sm h-8"
                />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                  onClick={() => setSocialLinks(prev => prev.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {socialLinks.length < 3 && (
              <Button type="button" variant="outline" size="sm" className="gap-1.5"
                onClick={() => setSocialLinks(prev => [...prev, { label: "", url: "" }])}>
                <Plus className="h-3.5 w-3.5" /> Add link
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardContent className="pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setValue("isPrivate", e.target.checked)}
                className="rounded"
              />
              <div>
                <p className="font-medium text-sm">Private profile</p>
                <p className="text-xs text-muted-foreground">Only you can see your profile and library</p>
              </div>
            </label>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">Profile saved successfully!</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save changes
        </Button>
      </form>
    </div>
  );
}
