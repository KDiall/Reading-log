import Link from "next/link";
import { BookOpen, Star, Users, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Personal Library",
    description:
      "Track every book you've read, are reading, or want to read. Log progress by page or percentage.",
  },
  {
    icon: Star,
    title: "Reviews & Ratings",
    description:
      "Write community reviews, rate books 1–5 stars, and discover what others think.",
  },
  {
    icon: Users,
    title: "Public Profiles",
    description:
      "Customizable reading identity — share your stats, reviews, and reading history.",
  },
  {
    icon: Trophy,
    title: "Reading Challenges",
    description:
      "Create or join book-count, page-count, genre bingo, and theme-based challenges.",
  },
  {
    icon: Zap,
    title: "Live Reading Rooms",
    description:
      "Join timed group reading sessions, track progress together in real time.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-24 md:py-32 gap-6 bg-gradient-to-b from-background to-muted/30">
        <div className="flex items-center gap-2 text-5xl font-extrabold tracking-tight">
          <BookOpen className="h-10 w-10" />
          BookLog
        </div>
        <p className="max-w-xl text-xl text-muted-foreground leading-relaxed">
          A free, social reading tracker for eBook and audiobook readers. Track
          your progress, write reviews, join challenges, and connect with fellow
          readers.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/register">
            <Button size="lg" className="px-8">
              Get started — it&apos;s free
            </Button>
          </Link>
          <Link href="/search">
            <Button size="lg" variant="outline" className="px-8">
              Browse books
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <h2 className="text-2xl font-bold text-center mb-10">
          Everything your reading life needs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <Icon className="h-7 w-7 mb-3" />
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/40 py-16 text-center px-4">
        <h2 className="text-2xl font-bold mb-3">Ready to start tracking?</h2>
        <p className="text-muted-foreground mb-6">
          Join BookLog for free. No credit card required.
        </p>
        <Link href="/register">
          <Button size="lg" className="px-10">
            Create your account
          </Button>
        </Link>
      </section>
    </div>
  );
}
