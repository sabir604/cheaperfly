import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link, { type LinkProps } from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700",
        navy: "bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950",
        outline: "border border-slate-300 bg-white text-navy-900 hover:border-slate-400 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
        danger: "bg-red-600 text-white hover:bg-red-700",
        dangerOutline: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        umrah: "bg-umrah-800 text-white hover:bg-umrah-700 active:bg-umrah-900",
        gold: "bg-gold-500 text-white hover:bg-gold-600",
        white: "bg-white text-navy-900 hover:bg-slate-100",
        link: "px-0 text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10",
        iconSm: "h-8 w-8",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, Variants {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, leftIcon, rightIcon, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export interface ButtonLinkProps extends Variants, Omit<LinkProps, "href"> {
  href: string;
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
  target?: string;
  rel?: string;
}

export function ButtonLink({ className, variant, size, block, leftIcon, rightIcon, children, href, disabled, ...rest }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
