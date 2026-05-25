"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("Missing token."); return; }
    fetch(`/api/auth/verify-email?token=${token}`)
      .then((res) => {
        if (res.redirected || res.ok) {
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2000);
        } else {
          return res.json().then((d) => { setStatus("error"); setMessage(d.error ?? "Verification failed."); });
        }
      })
      .catch(() => { setStatus("error"); setMessage("Something went wrong."); });
  }, [token, router]);

  return (
    <div className="text-center py-4">
      {status === "loading" && <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />}
      {status === "success" && (
        <>
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold">Email verified!</p>
          <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
          <p className="font-semibold">Verification failed</p>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2"><BookOpen className="h-8 w-8" /></div>
          <CardTitle>Email Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <VerifyContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
