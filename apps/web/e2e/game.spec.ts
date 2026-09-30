import { test, expect, type Page } from "@playwright/test";

/** PLAN.md §10, §12 step 9. */

async function joinAsNewGuest(page: Page, url: string, name: string) {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByText(name).first()).toBeVisible();
}

test("two players vote, reveal, and start a new round together", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto("/");
  await a.getByRole("button", { name: "Create game" }).click();
  await a.waitForURL(/\/game\//);
  const gameUrl = a.url();

  // A is the facilitator (creator); join as Alice.
  await a.getByLabel("Your name").fill("Alice");
  await a.getByRole("button", { name: "Join", exact: true }).click();
  await expect(a.getByText("Alice").first()).toBeVisible();

  // B joins via the same link, as a separate browser context (no shared storage).
  await joinAsNewGuest(b, gameUrl, "Bob");
  await expect(a.getByText("Bob")).toBeVisible();

  await a.getByRole("radio", { name: "5", exact: true }).click();
  await b.getByRole("radio", { name: "8", exact: true }).click();

  await a.getByRole("button", { name: "Reveal cards" }).click();
  // A 3s countdown (PLAN.md §7.2) runs before the reveal finalizes.
  await expect(a.getByRole("button", { name: "Start new vote" })).toBeVisible({ timeout: 8000 });
  await expect(b.getByRole("button", { name: "Start new vote" })).toBeVisible({ timeout: 8000 });

  // Both clients see the same results once revealed.
  await expect(a.getByText("6.5")).toBeVisible(); // average of 5 and 8
  await expect(b.getByText("6.5")).toBeVisible();

  await a.getByRole("button", { name: "Start new vote" }).click();
  await expect(a.getByText("Pick your cards!")).toBeVisible();
  await expect(b.getByText("Pick your cards!")).toBeVisible();

  await contextA.close();
  await contextB.close();
});

test("adding, voting on, and estimating an issue updates the total for everyone", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto("/");
  await a.getByRole("button", { name: "Create game" }).click();
  await a.waitForURL(/\/game\//);
  const gameUrl = a.url();

  await a.getByLabel("Your name").fill("Alice");
  await a.getByRole("button", { name: "Join", exact: true }).click();
  await joinAsNewGuest(b, gameUrl, "Bob");
  await expect(a.getByText("Bob")).toBeVisible();

  await a.getByRole("button", { name: "Issues" }).click();
  await a
    .getByPlaceholder("+ Add an issue (one per line to bulk-add)")
    .fill("Checkout flow rewrite");
  await a.getByRole("button", { name: "Add" }).click();
  await expect(a.getByText("Checkout flow rewrite")).toBeVisible();

  await a.getByRole("button", { name: "Vote this issue" }).click();
  await expect(a.getByText("Voting now")).toBeVisible();
  // Close the Issues drawer: Radix marks the rest of the page aria-hidden while it's open,
  // which would make the deck's cards invisible to getByRole below.
  await a.keyboard.press("Escape");

  // The round reset by selecting the issue clears any card selection.
  await a.getByRole("radio", { name: "3", exact: true }).click();
  await b.getByRole("radio", { name: "3", exact: true }).click();
  await a.getByRole("button", { name: "Reveal cards" }).click();
  await expect(a.getByLabel("Final estimate")).toBeVisible({ timeout: 8000 });

  await a.getByRole("button", { name: "Save" }).click();

  await a.getByRole("button", { name: "Issues" }).click();
  await expect(a.getByText("Total: 3 points")).toBeVisible();

  await b.getByRole("button", { name: "Issues" }).click();
  await expect(b.getByText("Total: 3 points")).toBeVisible();

  await contextA.close();
  await contextB.close();
});
