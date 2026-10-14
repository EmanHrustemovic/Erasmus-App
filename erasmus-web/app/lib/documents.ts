export const DOCUMENT_TYPES = [
  { key: "cv", label: "CV (Europass)" },
  { key: "transcript", label: "Transcript of Records" },
  { key: "motivation", label: "Motivation Letter" },
  { key: "language_proof", label: "Proof of Language" },
  { key: "recommendation", label: "Recommendation Letter" },
  { key: "learning_agreement", label: "Learning Agreement" },
  { key: "id_copy", label: "Passport/ID Copy" },
  { key: "application_form", label: "Application Form" },
] as const;

export type DocumentKey = (typeof DOCUMENT_TYPES)[number]["key"];

export const DOCUMENT_LABELS: Record<DocumentKey, string> = {
  cv: "CV (Europass)",
  transcript: "Transcript of Records",
  motivation: "Motivation Letter",
  language_proof: "Proof of Language",
  recommendation: "Recommendation Letter",
  learning_agreement: "Learning Agreement",
  id_copy: "Passport/ID Copy",
  application_form: "Application Form",
};

export const DOCUMENT_KEYS: DocumentKey[] = DOCUMENT_TYPES.map(item => item.key);

export const DOC_UPLOAD_FIELDS: Record<DocumentKey, string> = {
  cv: "cv",
  transcript: "transcript",
  motivation: "motivation_letter",
  language_proof: "proof_of_language",
  recommendation: "recommendation_letter",
  learning_agreement: "learning_agreement",
  id_copy: "id_copy",
  application_form: "application_form",
};
