import Link from "next/link";
import { BookOpen, Search, Library, LayoutDashboard, LogIn, Trophy, BookOpenCheck, MessageCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { NavbarClient } from "./NavbarClient";

export async function Navbar() {
  const session = await getSession();
  let user = null;

  if (session) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { username: true, displayName: true, avatarUrl: true },
    });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="h-5 w-5" />
          BookLog
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          <Link href="/search">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </Link>
          {user && (
            <>
              <Link href="/library">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Library className="h-4 w-4" />
                  Library
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/challenges">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Trophy className="h-4 w-4" />
                  Challenges
                </Button>
              </Link>
              <Link href="/rooms">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <BookOpenCheck className="h-4 w-4" />
                  Rooms
                </Button>
              </Link>
              <Link href="/messages">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  Messages
                </Button>
              </Link>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <NavbarClient user={user} />
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <LogIn className="h-4 w-4" />
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
