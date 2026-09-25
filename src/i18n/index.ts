import type { Language } from "../types";
import { en, type MessageKey } from "./en";
import { fa } from "./fa";

const dictionaries: Record<Language, Record<MessageKey, string>> = { en, fa };

export type { MessageKey };

export function translate(
  language: Language,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  let value = dictionaries[language][key];
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
  }
  return value;
}
