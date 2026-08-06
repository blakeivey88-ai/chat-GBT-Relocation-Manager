import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(new URL("../dist/styles.css", import.meta.url), "utf8");
const member = await readFile(new URL("../dist/member.html", import.meta.url), "utf8");

function relativeLuminance(hex) {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

test("Get Started plan prices stay readable on dark pricing cards", () => {
  const priceLabels = member.match(/<strong>\$[\d.]+\/mo<\/strong>/g) || [];
  assert.equal(priceLabels.length, 6);
  assert.match(
    styles,
    /html body \.expanded-pricing \.plan > strong\s*{[^}]*color:\s*var\(--blue-lift\)/,
  );

  for (const cardBackground of ["#0d1526", "#0a1020"]) {
    assert.ok(contrastRatio("#6e9bff", cardBackground) >= 4.5);
  }
});
