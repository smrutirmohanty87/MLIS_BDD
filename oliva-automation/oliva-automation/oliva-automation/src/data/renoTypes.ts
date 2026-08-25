/**
 * Data-driven model for the Oliva Construction "Renovation" OmniScript forms.
 * Both the product-level "Renovation" questionnaire (8 steps) and the 9
 * per-coverage "Coverage Questions" forms are expressed as `OmniForm` data and
 * driven by the generic OmniScriptFormPage engine.
 */

export type FieldKind =
  | 'radio' // Yes/No or named radio group — value = option label
  | 'text' // single-line text
  | 'textarea' // multi-line text
  | 'number' // numeric text
  | 'currency' // formatted numeric (entered as plain digits, e.g. "250000")
  | 'picklist' // combobox/dropdown — value = option label
  | 'checkbox' // value 'true' checks it (default: leave as-is)
  | 'readonly'; // display-only — skipped by the engine

export interface FormField {
  /** Exact visible label (without the leading required "*"). */
  label: string;
  kind: FieldKind;
  /** Value to enter / option to pick. Omit for readonly. */
  value?: string;
  /**
   * When a label is ambiguous (repeats across the form) use `nth` to pick the
   * n-th visible match (0-based). Rarely needed.
   */
  nth?: number;
}

export interface FormStep {
  /** Optional step title (from the Steps panel) — used only for logging. */
  title?: string;
  fields: FormField[];
  /** Button that advances/commits this step. */
  action: 'Next' | 'Save' | 'Submit';
}

export interface OmniForm {
  /** Human name for logging (e.g. coverage name or "Renovation Questionnaire"). */
  name: string;
  steps: FormStep[];
}

/** One coverage to add on the quote Coverages tab, plus its questionnaire. */
export interface RenoCoverage {
  /** Coverage name as it appears on the Coverages "Add" row. */
  addRowName: string;
  form: OmniForm;
}
