"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { ExpenseRow } from "@/types";
import { format } from "date-fns";

const EXPENSE_CATEGORIES = [
  "Shipping Supplies",
  "Platform Fees",
  "Storage",
  "Equipment",
  "Software",
  "Travel",
  "Marketing",
  "Other",
];

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));

const DEDUCTIBLE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (expense: ExpenseRow) => void;
}

interface FormState {
  date: string;
  category: string;
  description: string;
  amount: string;
  tax_deductible: "yes" | "no";
  receipt_url: string;
  notes: string;
}

export function AddExpenseModal({ open, onClose, onAdded }: AddExpenseModalProps) {
  const [form, setForm] = useState<FormState>({
    date: format(new Date(), "yyyy-MM-dd"),
    category: EXPENSE_CATEGORIES[0] ?? "",
    description: "",
    amount: "",
    tax_deductible: "yes",
    receipt_url: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  function validate(): boolean {
    const next: Partial<FormState> = {};
    if (!form.description.trim()) next.description = "Required";
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      next.amount = "Enter a valid amount";
    if (!form.date) next.date = "Required";
    if (form.receipt_url && !/^https?:\/\//.test(form.receipt_url))
      next.receipt_url = "Must be a valid URL";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError("");

    try {
      const res = await fetch("/api/sheets/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          category: form.category,
          description: form.description.trim(),
          amount: parseFloat(form.amount),
          tax_deductible: form.tax_deductible,
          receipt_url: form.receipt_url.trim(),
          notes: form.notes.trim(),
        }),
      });
      const json = (await res.json()) as { data?: ExpenseRow; error?: string };
      if (!res.ok || json.error) {
        setServerError(json.error ?? "Failed to add expense");
        return;
      }
      onAdded(json.data!);
      onClose();
      setForm({
        date: format(new Date(), "yyyy-MM-dd"),
        category: EXPENSE_CATEGORIES[0] ?? "",
        description: "",
        amount: "",
        tax_deductible: "yes",
        receipt_url: "",
        notes: "",
      });
      setErrors({});
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Expense">
      <form onSubmit={handleSubmit} className="p-5 space-y-4" noValidate>
        <Input
          label="Description"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          error={errors.description}
          placeholder="e.g. Poly mailer bags 100-pack"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(e) =>
              setForm((f) => ({ ...f, amount: e.target.value }))
            }
            error={errors.amount}
            prefix="$"
            placeholder="0.00"
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            error={errors.date}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            options={CATEGORY_OPTIONS}
          />
          <Select
            label="Tax Deductible"
            value={form.tax_deductible}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                tax_deductible: e.target.value as "yes" | "no",
              }))
            }
            options={DEDUCTIBLE_OPTIONS}
          />
        </div>
        <Input
          label="Receipt URL (optional)"
          type="url"
          value={form.receipt_url}
          onChange={(e) =>
            setForm((f) => ({ ...f, receipt_url: e.target.value }))
          }
          error={errors.receipt_url}
          placeholder="https://"
        />
        {serverError && <p className="text-loss text-sm">{serverError}</p>}
        <div className="flex gap-3 pt-2 pb-1">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Add Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
}
