"use client";

import { useId, useState } from "react";

type PasswordFieldProps = {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
};

export function PasswordField({
  name,
  label,
  placeholder,
  required,
  autoComplete,
  minLength
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div>
      {label ? (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <div className="flex items-center gap-2">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          className="w-full rounded-lg border border-slate-300 p-2.5"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
