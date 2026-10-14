"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cover photo: `next/image` filling its box, over a navy placeholder while it loads.
 * Pass positioning/size via `className` (e.g. "absolute inset-0") or an aspect `ratio`.
 * `scrim` darkens the bottom for overlaid text; a broken image falls back to an icon tile.
 */
export function Photo({
  src,
  alt = "",
  className,
  imgClassName,
  sizes = "(min-width:1024px) 33vw, 100vw",
  priority,
  ratio,
  scrim,
  children,
  position,
}: {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** CSS aspect-ratio, e.g. "4/3". */
  ratio?: string;
  scrim?: boolean;
  children?: ReactNode;
  /** CSS object-position, e.g. "50% 60%". */
  position?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-navy-100", scrim && "img-scrim", className)} style={ratio ? { aspectRatio: ratio } : undefined}>
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-navy-100 to-brand-100 text-navy-300" role="img" aria-label={alt}>
          <ImageOff className="h-8 w-8" aria-hidden />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={priority ? "eager" : undefined}
          fetchPriority={priority ? "high" : undefined}
          onError={() => setFailed(true)}
          className={cn("object-cover", imgClassName)}
          style={position ? { objectPosition: position } : undefined}
        />
      )}
      {children}
    </div>
  );
}
