"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarClientProps {
  user: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export function NavbarClient({ user }: NavbarClientProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/profile/${user.username}`}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <User className="h-4 w-4" />
          {user.displayName}
        </Button>
      </Link>
      <Link href="/settings">
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </Link>
      <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
