import { describe, expect, it } from "vitest";
import { t } from ".";
import { matchLocale, resolveInitialLocale, localeMessages, AVAILABLE_LOCALES } from "./locales";
import { validateLocaleMessages } from "./locale-validation";

const localeFiles = import.meta.glob("./locales/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

describe("locale resolution", () => {
  it("uses English under Vitest regardless of the host locale", () => {
    expect(resolveInitialLocale()).toBe("en");
  });

  it("matches browser languages exactly, then by base language", () => {
    expect(matchLocale(["pt-br"])).toBe("pt-BR");
    expect(matchLocale(["pt-PT"])).toBe("pt-BR");
    expect(matchLocale(["pt"])).toBe("pt-BR");
    expect(matchLocale(["es", "pt-BR"])).toBe("pt-BR");
    expect(matchLocale(["en-GB"])).toBe("en");
    expect(matchLocale(["fr"])).toBeNull();
    expect(matchLocale([])).toBeNull();
  });

  it("bundles messages for every non-English available locale", () => {
    for (const locale of AVAILABLE_LOCALES) {
      if (locale === "en") continue;
      expect(localeMessages[locale], locale).toBeDefined();
    }
  });
});

describe("translation lookup", () => {
  it("returns the natural-language key when no translation exists", () => {
    expect(t("Create your first organization")).toBe("Create your first organization");
    expect(t("Missing key", { defaultValue: "Fallback" })).toBe("Fallback");
    expect(t("Missing key")).toBe("Missing key");
  });

  it("keeps dots and colons inside keys intact", () => {
    expect(t("Get started by creating an organization.")).toBe("Get started by creating an organization.");
    expect(t("Status: ready")).toBe("Status: ready");
  });

  it("interpolates placeholders inside natural-language keys", () => {
    expect(t("Assigned to {{name}}", { name: "Ada" })).toBe("Assigned to Ada");
  });
});

describe("locale validation", () => {
  it("accepts every locale file", () => {
    for (const [path, messages] of Object.entries(localeFiles)) {
      expect(validateLocaleMessages(messages), path).toEqual([]);
    }
  });

  it("rejects non-object catalogs and non-string values", () => {
    expect(validateLocaleMessages(["x"])).toEqual(["<root> must be an object"]);
    expect(validateLocaleMessages({ Save: ["Salvar"] })).toEqual(['"Save" must be a string']);
  });

  it("requires interpolation placeholders to match the key", () => {
    expect(validateLocaleMessages({ "Invite {{name}} to {{company}}": "Convidar {{name}}" })).toEqual([
      '"Invite {{name}} to {{company}}" interpolation placeholders must match the key exactly: expected ["company","name"], received ["name"]',
    ]);
  });

  it("rejects executable, raw HTML, and unexpected link payloads not present in the key", () => {
    expect(
      validateLocaleMessages({
        "Create organization": "<script>alert(1)</script>",
        "Create company": '<span ONCLICK="alert(1)">Create</span>',
        "Open docs": "javascript:alert(1)",
        "Download": "data:text/html,hello",
        "Learn more": "https://example.test",
        "Save": "<strong>Salvar</strong>",
      }),
    ).toEqual(
      expect.arrayContaining([
        '"Create organization" contains disallowed <script',
        '"Create company" contains disallowed event-handler attribute',
        '"Open docs" contains disallowed javascript:',
        '"Download" contains disallowed data:',
        '"Learn more" contains disallowed unexpected URL',
        '"Save" contains disallowed raw HTML tag',
      ]),
    );
  });

  it("caps localized string length relative to the key", () => {
    expect(validateLocaleMessages({ Short: "x".repeat(200) })).toEqual([
      '"Short" is too long: 200 characters exceeds 133',
    ]);
  });

  it("reports keys the UI no longer uses when known keys are supplied", () => {
    expect(validateLocaleMessages({ Save: "Salvar", Gone: "Sumiu" }, new Set(["Save"]))).toEqual([
      '"Gone" is not used by the UI',
    ]);
  });
});
