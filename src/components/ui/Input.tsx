"use client";

import { clsx } from "clsx";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, prefix, suffix, className, id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[#a3a3a3]"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-[#a3a3a3] text-sm select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full bg-[#0f0f0f] border rounded-xl text-[#f5f5f5] placeholder-[#525252] transition-colors",
            "min-h-[44px] px-3 py-2.5 text-sm",
            "focus:outline-none focus:border-profit",
            error ? "border-loss" : "border-[#2a2a2a] hover:border-[#3a3a3a]",
            prefix && "pl-7",
            suffix && "pr-10",
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-[#a3a3a3] text-sm select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-loss text-xs mt-0.5">{error}</p>}
    </div>
  );
});
