import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/test";
import { seedReviewRankingScenario, shiftEventPhase } from "../helpers/scenarios";
import { E2E_USERS } from "../helpers/users";

test("管理员分配评委后可完成评分、汇总榜单并公开排名", async ({
  resetState,
  createAuthedPage,
}) => {
  await resetState();
  const event = await seedReviewRankingScenario();
  const adminPage = await createAuthedPage("admin");

  await adminPage.goto(`/admin/events/${event.id}/judging`);
  await adminPage.getByPlaceholder("输入评委邮箱，例如 judge@example.com").fill(E2E_USERS.judgeOne.email);
  await adminPage.getByRole("button", { name: "分配评委" }).click();
  await expect(adminPage.getByText("评委分配成功。")).toBeVisible();
  await expect(adminPage.getByText(E2E_USERS.judgeOne.email)).toBeVisible();

  await adminPage.getByPlaceholder("输入评委邮箱，例如 judge@example.com").fill(E2E_USERS.judgeTwo.email);
  await adminPage.getByRole("button", { name: "分配评委" }).click();
  await expect(adminPage.getByText(E2E_USERS.judgeTwo.email)).toBeVisible();

  await shiftEventPhase(event.id, "post-review");
  const judgeOnePage = await createAuthedPage("judgeOne");
  await judgeOnePage.goto(`/judge/events/${event.id}?projectId=${event.projects[0]?.id}`);
  await expect(judgeOnePage.getByText("当前不在评审时间窗口内")).toBeVisible();
  await expect(judgeOnePage.getByRole("button", { name: "保存评分" })).toBeDisabled();

  await shiftEventPhase(event.id, "review");
  await scoreProject(judgeOnePage, event.id, event.projects[0]?.id ?? "", {
    创新性: "9",
    完成度: "8.5",
    落地价值: "8",
  });
  await scoreProject(judgeOnePage, event.id, event.projects[1]?.id ?? "", {
    创新性: "7",
    完成度: "7",
    落地价值: "7",
  });

  const judgeTwoPage = await createAuthedPage("judgeTwo");
  await scoreProject(judgeTwoPage, event.id, event.projects[0]?.id ?? "", {
    创新性: "9.5",
    完成度: "8.5",
    落地价值: "8",
  });
  await scoreProject(judgeTwoPage, event.id, event.projects[1]?.id ?? "", {
    创新性: "8",
    完成度: "8",
    落地价值: "7",
  });

  await adminPage.goto(`/admin/events/${event.id}/judging`);
  const alphaRow = adminPage.locator("tr").filter({ hasText: "Alpha Copilot" });
  const betaRow = adminPage.locator("tr").filter({ hasText: "Beta Workspace" });
  await expect(alphaRow).toContainText("#1");
  await expect(alphaRow).toContainText("2");
  await expect(alphaRow).toContainText("86.75");
  await expect(betaRow).toContainText("#2");
  await expect(betaRow).toContainText("73.75");

  await adminPage.getByRole("button", { name: "公开排名" }).click();
  await expect(adminPage.getByText("排名已公开。")).toBeVisible();

  await adminPage.goto(`/events/${event.slug}`);
  await expect(adminPage.getByRole("heading", { name: "公开榜单" })).toBeVisible();
  await expect(adminPage.locator("tr").filter({ hasText: "Alpha Copilot" })).toContainText("#1");
  await expect(adminPage.locator("tr").filter({ hasText: "Beta Workspace" })).toContainText("#2");
});

async function scoreProject(
  page: Page,
  eventId: string,
  projectId: string,
  scores: Record<"创新性" | "完成度" | "落地价值", string>
) {
  await page.goto(`/judge/events/${eventId}?projectId=${projectId}`);
  // Wait for the score form inputs to be visible and enabled
  await page.waitForSelector('input[type="number"][inputmode="decimal"]', { state: "visible", timeout: 10000 });
  // Use inputmode="decimal" to find score inputs (more reliable than label matching)
  const inputs = page.locator('input[type="number"][inputmode="decimal"]');
  await inputs.nth(0).fill(scores["创新性"]);
  await inputs.nth(1).fill(scores["完成度"]);
  await inputs.nth(2).fill(scores["落地价值"]);
  // Fill comment
  const textarea = page.locator("textarea").first();
  await textarea.fill("自动化评分回归意见。");
  // Submit
  const saveButton = page.getByRole("button", { name: "保存评分" });
  await saveButton.click();
  // Wait for button to return to "保存评分" state (was "保存中..." during pending)
  await expect(saveButton).toHaveText("保存评分", { timeout: 10000 });
}
