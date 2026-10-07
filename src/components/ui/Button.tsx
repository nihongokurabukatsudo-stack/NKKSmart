import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type ButtonVariant = "primary" | "secondary" | "dark";

interface ButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
  isRouteLink?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-nkk-red text-white shadow-neon hover:-translate-y-0.5 hover:bg-nkk-redDark hover:shadow-[0_0_35px_rgba(239,35,60,0.42)]",
  secondary: "border border-white/55 bg-white/5 text-white hover:-translate-y-0.5 hover:border-nkk-red hover:bg-nkk-red/10",
  dark: "bg-nkk-pink text-white shadow-pink hover:-translate-y-0.5 hover:bg-nkk-red",
};

export function Button({
  children,
  href,
  variant = "primary",
  isRouteLink = false,
  className = "",
  ...props
}: ButtonProps) {
  const classes = `inline-flex min-h-12 items-center justify-center rounded-2xl px-6 py-3 text-sm font-extrabold transition duration-300 ${variantClasses[variant]} ${className}`;

  if (isRouteLink) {
    return (
      <Link to={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={classes} {...props}>
      {children}
    </a>
  );
}
