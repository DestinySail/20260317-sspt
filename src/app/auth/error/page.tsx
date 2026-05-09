"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-semibold">登录错误</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          错误类型：{error ?? "未知"}
        </p>
        <a
          href="/"
          className="mt-4 inline-block text-sm underline text-primary"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
