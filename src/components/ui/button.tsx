import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "icon" && "h-9 w-9 p-0",
        variant === "primary" && "border-teal-700 bg-teal-700 text-white hover:border-teal-800 hover:bg-teal-800",
        variant === "secondary" && "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
        variant === "ghost" && "border-transparent bg-transparent text-slate-900 shadow-none hover:bg-slate-100",
        variant === "danger" && "border-destructive bg-destructive text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}
