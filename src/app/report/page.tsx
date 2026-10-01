"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    const now = new Date();
    router.replace(`/report/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`);
  }, [router]);
  return null;
}
