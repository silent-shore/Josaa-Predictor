"use client";

import Link from "next/link";
import type { MouseEventHandler } from "react";

export function InstituteLink({
  name,
  className,
  onClick
}: {
  name: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href={{ pathname: "/institutes", query: { institute: name } }}
      onClick={onClick}
      className={className ?? "text-[var(--primary)] underline-offset-4 hover:underline"}
    >
      {name}
    </Link>
  );
}
