const MAX_STRING_LENGTH = 2_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function interpolationPlaceholders(value: string) {
  return Array.from(value.matchAll(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g), (match) => match[1]).sort();
}

function hasRawHtml(value: string) {
  return /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^>]*)?>/.test(value);
}

function hasEventHandlerAttribute(value: string) {
  return /\son[A-Za-z]+\s*=/i.test(value);
}

function urlsIn(value: string) {
  return Array.from(value.matchAll(/\bhttps?:\/\/[^\s<>"')]+/gi), (match) => match[0]).sort();
}

function hasBlockedData(value: string, reference: string) {
  const checks: Array<[boolean, boolean, string]> = [
    [/<script\b/i.test(value), /<script\b/i.test(reference), "<script"],
    [hasEventHandlerAttribute(value), hasEventHandlerAttribute(reference), "event-handler attribute"],
    [/\bjavascript\s*:/i.test(value), /\bjavascript\s*:/i.test(reference), "javascript:"],
    [/\bdata\s*:/i.test(value), /\bdata\s*:/i.test(reference), "data:"],
    [hasRawHtml(value), hasRawHtml(reference), "raw HTML tag"],
  ];

  const blocked = checks
    .filter(([candidateHas, referenceHas]) => candidateHas && !referenceHas)
    .map(([, , blockedPayload]) => blockedPayload);

  const referenceUrls = new Set(urlsIn(reference));
  const unexpectedUrl = urlsIn(value).find((url) => !referenceUrls.has(url));
  if (unexpectedUrl) blocked.push("unexpected URL");

  return blocked;
}

function validateString(key: string, value: string, errors: string[]) {
  const candidatePlaceholders = interpolationPlaceholders(value);
  const referencePlaceholders = interpolationPlaceholders(key);
  if (candidatePlaceholders.join("\u0000") !== referencePlaceholders.join("\u0000")) {
    errors.push(
      `${JSON.stringify(key)} interpolation placeholders must match the key exactly: expected ${JSON.stringify(
        referencePlaceholders,
      )}, received ${JSON.stringify(candidatePlaceholders)}`,
    );
  }

  for (const blockedPayload of hasBlockedData(value, key)) {
    errors.push(`${JSON.stringify(key)} contains disallowed ${blockedPayload}`);
  }

  const relativeLimit = Math.max(key.length * 4 + 64, key.length + 128);
  const lengthLimit = Math.min(MAX_STRING_LENGTH, relativeLimit);
  if (value.length > lengthLimit) {
    errors.push(`${JSON.stringify(key)} is too long: ${value.length} characters exceeds ${lengthLimit}`);
  }
}

export function validateLocaleMessages(candidate: unknown, knownKeys?: ReadonlySet<string>) {
  if (!isPlainObject(candidate)) return ["<root> must be an object"];
  const errors: string[] = [];
  for (const [key, value] of Object.entries(candidate)) {
    if (typeof value !== "string") {
      errors.push(`${JSON.stringify(key)} must be a string`);
      continue;
    }
    if (knownKeys && !knownKeys.has(key)) {
      errors.push(`${JSON.stringify(key)} is not used by the UI`);
    }
    validateString(key, value, errors);
  }
  return errors;
}

export function assertValidLocaleMessages(candidate: unknown, knownKeys?: ReadonlySet<string>) {
  const errors = validateLocaleMessages(candidate, knownKeys);
  if (errors.length > 0) {
    throw new Error(`Invalid locale messages:\n${errors.join("\n")}`);
  }
}
