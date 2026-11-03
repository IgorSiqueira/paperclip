import type { ArtifactSubject } from "./kinds";
import { t } from "@/i18n";

export function testSubject(overrides: Partial<ArtifactSubject> & Pick<ArtifactSubject, "kind">): ArtifactSubject {
  return { title: t("An artifact"), updatedAt: "2026-09-28T11:07:00", taskIdentifier: "ACM-3", ...overrides };
}
