import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn("mb-1.5 block text-xs font-medium text-slate-500", className)}>{children}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-900 outline-none ring-primary/20 transition placeholder:text-slate-400 focus:border-primary focus:ring-4",
        props.className
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none ring-primary/20 transition placeholder:text-slate-400 focus:border-primary focus:ring-4",
        props.className
      )}
    />
  );
}
