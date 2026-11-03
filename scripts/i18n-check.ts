import fs from "node:fs";
import path from "node:path";
import { collectTranslationKeys, listSourceFiles, parseSource, relativeFile, UI_SRC } from "./i18n-lib";
import { validateLocaleMessages } from "../ui/src/i18n/locale-validation";

type Options = { locale: string | null; untranslated: string | null; strict: boolean; json: boolean };

function parseArguments(argv: string[]): Options {
  const options: Options = { locale: null, untranslated: null, strict: false, json: false };
  for (const argument of argv) {
    if (argument.startsWith("--locale=")) options.locale = argument.slice("--locale=".length);
    else if (argument === "--untranslated") options.untranslated = "-";
    else if (argument.startsWith("--untranslated=")) options.untranslated = argument.slice("--untranslated=".length);
    else if (argument === "--strict") options.strict = true;
    else if (argument === "--json") options.json = true;
  }
  return options;
}

function keysInCode(): Map<string, string[]> {
  const keys = new Map<string, string[]>();
  for (const file of listSourceFiles(UI_SRC, [".ts", ".tsx"])) {
    const source = fs.readFileSync(file, "utf8");
    const program = parseSource(file, source);
    for (const key of collectTranslationKeys(program, source).keys()) {
      const files = keys.get(key) ?? [];
      files.push(relativeFile(file));
      keys.set(key, files);
    }
  }
  return keys;
}

function main(): void {
  const options = parseArguments(process.argv.slice(2));
  const localesDirectory = path.join(UI_SRC, "i18n", "locales");
  const codeKeys = keysInCode();
  const known = new Set(codeKeys.keys());
  const knownWithPlurals = {
    has: (key: string) => known.has(key) || known.has(key.replace(/_(one|other|zero|two|few|many)$/, "")),
  } as ReadonlySet<string>;
  const localeFiles = fs.readdirSync(localesDirectory).filter((name) => name.endsWith(".json")).sort();
  const selected = options.locale ? localeFiles.filter((name) => name === `${options.locale}.json`) : localeFiles;
  if (selected.length === 0) {
    console.error(`No locale file found for ${options.locale}`);
    process.exit(1);
  }
  let failed = false;
  const results: Record<string, unknown> = {};
  for (const name of selected) {
    const locale = name.replace(/\.json$/, "");
    const messages = JSON.parse(fs.readFileSync(path.join(localesDirectory, name), "utf8")) as Record<string, unknown>;
    const errors = validateLocaleMessages(messages, knownWithPlurals);
    const stale = errors.filter((error) => error.endsWith("is not used by the UI"));
    const invalid = errors.filter((error) => !error.endsWith("is not used by the UI"));
    const translated = Object.keys(messages).filter((key) => known.has(key));
    const pluralVariants = Object.keys(messages).filter((key) => !known.has(key) && knownWithPlurals.has(key)).length;
    const untranslated = [...known].filter((key) => !(key in messages)).sort((left, right) => left.localeCompare(right));
    results[locale] = {
      keysInUi: known.size,
      translated: translated.length,
      untranslated: untranslated.length,
      stale: stale.length,
      invalid: invalid.length,
      pluralVariants,
      coverage: known.size === 0 ? 1 : translated.length / known.size,
    };
    if (invalid.length > 0) failed = true;
    if (options.strict && stale.length > 0) failed = true;
    if (!options.json) {
      console.log(`${locale}: ${translated.length}/${known.size} translated (${Math.round((translated.length / Math.max(known.size, 1)) * 1000) / 10}%), ${untranslated.length} untranslated, ${stale.length} stale, ${invalid.length} invalid`);
      for (const error of invalid) console.log(`  invalid: ${error}`);
      if (options.strict) for (const error of stale) console.log(`  stale: ${error}`);
    }
    if (options.untranslated && (options.locale === null || options.locale === locale)) {
      const payload = Object.fromEntries(untranslated.map((key) => [key, codeKeys.get(key)?.slice(0, 2) ?? []]));
      if (options.untranslated === "-") console.log(JSON.stringify(untranslated, null, 2));
      else fs.writeFileSync(options.untranslated, `${JSON.stringify(payload, null, 2)}\n`);
    }
  }
  if (options.json) console.log(JSON.stringify(results, null, 2));
  process.exit(failed ? 1 : 0);
}

main();
