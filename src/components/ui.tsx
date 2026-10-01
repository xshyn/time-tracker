import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]";
  const styles: Record<Variant, string> = {
    primary: "bg-primary text-primary-foreground shadow-card hover:bg-primary-dark",
    secondary: "border border-border bg-card text-foreground shadow-sm hover:bg-pine",
    ghost: "bg-transparent text-foreground hover:bg-pine",
    danger: "bg-destructive text-white shadow-card hover:opacity-90",
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`glass rounded-2xl p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}

export function PasswordInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input
        type={show ? "text" : "password"}
        className={`w-full rounded-xl border border-border bg-card py-2.5 pe-11 ps-3 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute inset-y-0 end-1 flex cursor-pointer items-center rounded-lg px-2 text-muted-foreground transition-colors hover:text-primary-light"
      >
        {show ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </span>
  );
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-pine px-2.5 py-0.5 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

export function Separator({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-border ${className}`} aria-hidden="true" />;
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{message}</p>;
}
