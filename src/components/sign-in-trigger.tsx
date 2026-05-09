"use client";

import { useState } from "react";
import { SignInDialog } from "@/components/sign-in-dialog";

interface Provider {
  id: string;
  name: string;
}

interface SignInTriggerProps {
  providers: Provider[];
  callbackUrl?: string;
  className?: string;
}

export function SignInTrigger({ providers, callbackUrl, className }: SignInTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        登录
      </button>
      <SignInDialog
        open={open}
        onOpenChange={setOpen}
        providers={providers}
        callbackUrl={callbackUrl}
      />
    </>
  );
}
