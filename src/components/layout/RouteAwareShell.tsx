"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const STANDALONE_ROUTES = new Set([
  "/forgot-password",
  "/reset-password",
]);

interface RouteAwareShellProps {
  children: ReactNode;
  navigation: ReactNode;
  footer: ReactNode;
  overlays: ReactNode;
}

export default function RouteAwareShell({
  children,
  navigation,
  footer,
  overlays,
}: RouteAwareShellProps) {
  const pathname = usePathname();
  const isStandalone = STANDALONE_ROUTES.has(
    pathname
  );

  return (
    <>
      {isStandalone ? null : navigation}

      <div className="flex-1">{children}</div>

      {isStandalone ? null : footer}
      {isStandalone ? null : overlays}
    </>
  );
}
