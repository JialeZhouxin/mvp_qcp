import type { Page } from "@playwright/test";

const TOKEN_KEY = "qcp_access_token";
const GUIDE_DISMISSED_KEY = "qcp.workbench.guide.dismissed.v1";
const TOKEN_VALUE = "playwright-debug-token";

export async function primeAuthenticatedSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ tokenKey, tokenValue, guideKey }) => {
      window.localStorage.setItem(tokenKey, tokenValue);
      window.localStorage.setItem(guideKey, "1");
    },
    { tokenKey: TOKEN_KEY, tokenValue: TOKEN_VALUE, guideKey: GUIDE_DISMISSED_KEY },
  );
}
