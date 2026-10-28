import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Buttons                                                                   */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent" | "subtle";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const base =
    "inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-[15px]",
    icon: "h-10 w-10 p-0",
  };
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-primary text-primary-foreground shadow-card hover:bg-primary-dark",
    secondary: "border border-border bg-card/80 text-foreground shadow-sm hover:border-primary-light/60 hover:bg-pine",
    ghost: "bg-transparent text-foreground hover:bg-pine",
    danger: "bg-destructive text-white shadow-card hover:opacity-90",
    accent: "bg-accent text-accent-foreground shadow-card hover:bg-accent-dark",
    subtle: "bg-pine text-foreground hover:bg-primary/10",
  };
  return <button type={type} className={`${base} ${sizes[size]} ${styles[variant]} ${className}`} {...props} />;
}

export function IconButton({
  label,
  variant = "ghost",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: "ghost" | "outline" | "danger" }) {
  const base =
    "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40";
  const styles = {
    ghost: "text-muted-foreground hover:bg-pine hover:text-foreground",
    outline: "border border-border bg-card/80 text-muted-foreground shadow-sm hover:border-primary-light/60 hover:text-foreground",
    danger: "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
  };
  return <button type={type} aria-label={label} title={label} className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

/* -------------------------------------------------------------------------- */
/*  Surfaces                                                                  */
/* -------------------------------------------------------------------------- */

export function Card({
  className = "",
  children,
  padding = true,
}: {
  className?: string;
  children: ReactNode;
  padding?: boolean;
}) {
  return (
    <div className={`glass relative rounded-2xl sm:rounded-3xl ${padding ? "p-4 sm:p-5" : ""} ${className}`}>{children}</div>
  );
}

export function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-dark ring-1 ring-primary/10 dark:text-primary-light">
            <Icon size={17} aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold tracking-tight">{title}</h2>
          {description ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
  progress,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "primary" | "accent" | "neutral";
  progress?: number;
  className?: string;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary-dark ring-primary/10 dark:text-primary-light",
    accent: "bg-accent/10 text-accent-dark ring-accent/10 dark:text-accent-light",
    neutral: "bg-muted text-muted-foreground ring-border",
  };
  const bars = {
    primary: "bg-primary",
    accent: "bg-accent",
    neutral: "bg-muted-foreground/60",
  };
  const pct = typeof progress === "number" ? Math.min(1, Math.max(0, progress)) : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-3 shadow-sm backdrop-blur-md sm:p-3.5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-xl ring-1 sm:h-8 sm:w-8 ${tones[tone]}`}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <span className="truncate text-[8px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:text-[10px] sm:tracking-[0.16em]">
          {label}
        </span>
      </div>
      <p className="mt-2.5 text-xl font-extrabold tabular-nums tracking-tight sm:text-2xl">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">{hint}</p> : null}
      {pct !== null ? (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted sm:mt-3" aria-hidden="true">
          <div className={`h-full rounded-full transition-all duration-500 ${bars[tone]}`} style={{ width: `${pct * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Data display                                                              */
/* -------------------------------------------------------------------------- */

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "accent" | "outline" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "border-border bg-pine text-foreground/80",
    primary: "border-primary/20 bg-primary/10 text-primary-dark dark:text-primary-light",
    accent: "border-accent/20 bg-accent/10 text-accent-dark dark:text-accent-light",
    outline: "border-border bg-transparent text-muted-foreground",
    danger: "border-destructive/25 bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressRing({
  value,
  max,
  size = 120,
  stroke = 9,
  label,
  caption,
  tone = "default",
  className = "",
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
  caption?: string;
  tone?: "default" | "hero";
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(1, Math.max(0, value / safeMax));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const track = tone === "hero" ? "text-white/15" : "text-muted";
  const arc = tone === "hero" ? "text-accent-light" : "text-primary-light";
  const isCompact = size <= 104;
  const labelSize = size <= 56 ? "text-[10px]" : size <= 104 ? "text-base" : "text-2xl";

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={caption ? `${label} / ${caption}` : label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className={track}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className={`${arc} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <span className="absolute inset-[14%] flex min-w-0 flex-col items-center justify-center text-center">
        <span className={`block max-w-full overflow-hidden text-ellipsis whitespace-nowrap ${labelSize} font-extrabold tabular-nums leading-none tracking-tight`}>
          {label}
        </span>
        {caption ? (
          <span
            className={`mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-bold uppercase ${
              isCompact ? "text-[7px] tracking-normal" : "text-[9px] tracking-[0.14em]"
            } ${
              tone === "hero" ? "text-white/60" : "text-muted-foreground"
            }`}
          >
            {caption}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form controls                                                             */
/* -------------------------------------------------------------------------- */

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary-light/40 focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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
        className={`w-full rounded-xl border border-border bg-card py-2.5 pe-11 ps-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary-light/40 focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
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
      className={`w-full rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary-light/40 focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  icon: Icon,
  disabled = false,
  className = "",
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "border-primary/30 bg-primary/10 text-primary-dark shadow-sm dark:text-primary-light"
          : "border-border bg-card/80 text-muted-foreground hover:border-primary-light/40 hover:text-foreground"
      } ${className}`}
    >
      {Icon ? <Icon size={14} aria-hidden="true" /> : null}
      <span>{label}</span>
      <span
        className={`relative ms-0.5 h-4 w-7 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-border"}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-150 ${
            checked ? "start-3.5" : "start-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: { value: T; label: string; count?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex max-w-full overflow-x-auto rounded-xl border border-border bg-card/70 p-1 shadow-sm backdrop-blur-md ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex-none ${
              selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="truncate">{option.label}</span>
            {option.count !== undefined ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums leading-none ${
                  selected ? "bg-white/20" : "bg-muted text-muted-foreground"
                }`}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Feedback                                                                  */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  message,
  title,
  icon: Icon,
  action,
  className = "",
}: {
  message: string;
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-pine/30 px-4 py-6 text-center ${className}`}
    >
      {Icon ? (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-primary-light shadow-sm ring-1 ring-border/70">
          <Icon size={20} aria-hidden="true" />
        </span>
      ) : null}
      {title ? <p className="text-sm font-bold">{title}</p> : null}
      <p className={`text-sm text-muted-foreground ${title ? "mt-1" : ""}`}>{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Separator({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-border ${className}`} aria-hidden="true" />;
}
