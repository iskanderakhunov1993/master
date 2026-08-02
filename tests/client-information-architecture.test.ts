import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("public copy does not present demo feedback or unmeasured speed as proven", () => {
  const landing = source("src/components/landing-page.tsx");
  const metadata = source("src/app/layout.tsx");

  assert.doesNotMatch(landing, /за минуту|около минуты|Решим задачу быстро/iu);
  assert.doesNotMatch(metadata, /за минуту|около минуты/iu);
  assert.match(landing, /Демонстрационный пример/u);
  assert.match(landing, /не отзывы реальных пользователей/u);
});

test("client top-level navigation has four sections and home owns care tools", () => {
  const navigation = source("src/components/dashboard/dashboard-nav.tsx");
  const home = source("src/components/client/home-passport.tsx");

  const clientStart = navigation.indexOf("CLIENT: [");
  const masterStart = navigation.indexOf("MASTER: [", clientStart);
  assert.ok(clientStart >= 0 && masterStart > clientStart, "client navigation block is missing");
  const clientBlock = navigation.slice(clientStart, masterStart);
  assert.equal((clientBlock.match(/href:/gu) ?? []).length, 4);
  for (const href of ["/client", "/client/orders", "/client/home", "/client/profile"]) {
    assert.ok(clientBlock.includes(`href: "${href}"`), `missing top-level client route ${href}`);
  }
  for (const href of ["/client/tasks", "/client/calendar", "/client/subscriptions", "/client/addresses"]) {
    assert.ok(!clientBlock.includes(`href: "${href}"`), `secondary route leaked into top-level navigation: ${href}`);
    assert.ok(home.includes(`href="${href}"`), `home hub is missing secondary route ${href}`);
  }
});
