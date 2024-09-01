import { test as base, expect } from "@playwright/test";
import type { Page, BrowserContext, Locator, Cookie, Response } from "@playwright/test";
import { faker } from "@faker-js/faker";
import type { Tokens } from "~/utils/supertokens/cookieHelpers.server";

/* ---------------------------------------- Global Helpers Setup ---------------------------------------- */
const paths = Object.freeze({
  home: "/",
  private: "/private",
  login: "/login",
  refresh: "/auth/session/refresh",
  passwordReset: "/reset-password",
});

interface Account {
  email: string;
  password: string;
}

interface TestScopedFixtures {
  /** Playwright's built-in `page` fixture, with a user already authenticated in the application */
  pageWithUser: Page;
}

interface WorkerScopedFixtures {
  /** The `email` and `password` details of an already-existing account */
  existingAccount: Account;
}

const it = base.extend<TestScopedFixtures, WorkerScopedFixtures>({
  // TODO: Prevent `existingAccount` from causing a Race Condition
  existingAccount: [
    async ({ browser }, use) => {
      // User Info
      const email = faker.internet.email();
      const password = "1234567a";

      // Create user
      const page = await browser.newPage();
      await visitSignUpPage(page);
      await page.getByRole("textbox", { name: /email/i }).fill(email);
      await page.getByRole("textbox", { name: /password/i }).fill(password);
      await page.getByRole("button", { name: /sign up/i }).click();

      // Cleanup
      await page.getByRole("link", { name: /logout/i }).click();
      await page.close();

      // Provide Worker Fixture Data
      await use({ email, password });
    },
    { scope: "worker" },
  ],
  async pageWithUser({ page, existingAccount }, use) {
    // Login
    await page.goto(paths.login);
    await page.getByRole("textbox", { name: /email/i }).fill(existingAccount.email);
    await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Expose page after login
    await use(page);

    // Logout
    await page.goto(paths.home);
    const logoutButton = page.getByRole("link", { name: /logout/i });
    if (await logoutButton.isVisible()) await logoutButton.click();
  },
});

async function visitSignUpPage(page: Page): Promise<void> {
  await page.goto(paths.login);
  await page.getByRole("link", { name: /sign up/i }).click();
  await page.waitForURL(`${paths.login}?mode=signup`);
  await expect(page.getByRole("heading", { name: /sign up/i, level: 1 })).toBeVisible();
}

type AuthTokens = { [K in Extract<keyof Tokens, "accessToken" | "refreshToken">]: Cookie };

/**
 * Retrieves the Auth Tokens belonging to the current user in the application (if any exist).
 * @param context The {@link BrowserContext} of the {@link Page} being tested. (Needed to access browser cookies.)
 * @param required When `true` (default), indicates that all Auth Tokens are expected to exist. If any are missing,
 * the function will `throw`.
 */
async function getAuthTokens(context: BrowserContext, required: false): Promise<Partial<AuthTokens>>;
async function getAuthTokens(context: BrowserContext, required?: true): Promise<AuthTokens>;
async function getAuthTokens(context: BrowserContext, required?: boolean): Promise<AuthTokens | Partial<AuthTokens>> {
  const cookies = await context.cookies();
  const tokens = {
    accessToken: cookies.find((c) => c.name === "sAccessToken"),
    refreshToken: cookies.find((c) => c.name === "sRefreshToken"),
  };

  if (required) {
    expect(tokens.accessToken).toEqual(expect.anything());
    expect(tokens.refreshToken).toEqual(expect.anything());
  }

  return tokens;
}

// TODO: Deduplicate whatever other logic you can, such as User Login (where/if necessary)
// TODO: We should probably be consistent between using `expect(url)` and `page.waitForURL` ...
/* ---------------------------------------- Tests ---------------------------------------- */
it.describe("Authenticated Application", () => {
  // TODO: Test with JavaScript BOTH enabled and disabled
  it.use({ javaScriptEnabled: false });

  /* -------------------- Setup / Constants -------------------- */
  /** The amount of time after which an access token expires (in `milliseconds`). 2000ms (with a buffer). */
  const accessTokenExpiration = 2 * 1000 * 1.5;

  /** The amount of time after which a refresh token expires (in `milliseconds`). 6000ms (with a buffer). */
  const refreshTokenExpiration = accessTokenExpiration * 3 * 1.2;

  /** Asserts that the provided `field` is `aria-invalid`, and that it has the expected error `message` */
  async function expectErrorFor(field: Locator, message: string): Promise<void> {
    await expect(field).toHaveAttribute("aria-invalid", String(true));
    await expect(field).toHaveAccessibleDescription(message);
  }

  /** Asserts that the provided `field` is **_not_** `aria-invalid`, and that it has no error message(s) */
  async function expectValidField(field: Locator): Promise<void> {
    await expect(field).not.toHaveAttribute("aria-invalid", String(true));
    await expect(field).toHaveAccessibleDescription("");
  }

  async function expectUserToBeUnauthenticated(context: BrowserContext): Promise<void> {
    const tokens = await getAuthTokens(context, false);
    expect(tokens.accessToken).toBe(undefined);
    expect(tokens.refreshToken).toBe(undefined);
  }

  /* -------------------- Tests -------------------- */
  it.describe("Unauthenticated User Management", () => {
    it("Allows unauthenticated users to visit public pages (like the Home Page)", async ({ page }) => {
      await page.goto(paths.home);
      await expect(page.getByText("Hello! This page is publicly accessible to anyone and everyone!")).toBeVisible();
    });

    it("Redirects unauthenticated users to the Login Page when they visit a secure route", async ({ page }) => {
      await page.goto(paths.private);
      await expect(page.getByRole("heading", { name: /sign in/i, level: 1 })).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(paths.login);
    });
  });

  it.describe("User Signup", () => {
    it("Allows users to signup with an email and password", async ({ page, context }) => {
      await visitSignUpPage(page);
      const email = faker.internet.email();
      const password = "12345678a";

      // Sign up
      await page.getByRole("textbox", { name: /email/i }).fill(email);
      await page.getByRole("textbox", { name: /password/i }).fill(password);
      await page.getByRole("button", { name: /sign up/i }).click();

      // Verify existence of access + refresh token
      await page.waitForURL(paths.home);
      const cookies = await context.cookies();
      expect(cookies.some((c) => c.name === "sAccessToken")).toBe(true);
      expect(cookies.some((c) => c.name === "sRefreshToken")).toBe(true);

      // Verify access to secure pages
      await page.goto(paths.private);
      await expect(page.getByText("Hello! This page is private!")).toBeVisible();
    });

    it("Requires users to signup with a valid email and a secure password", async ({
      page,
      context,
      javaScriptEnabled,
    }) => {
      await visitSignUpPage(page);
      const email = faker.internet.email();
      const password = "1234567a";

      /* ---------- Empty fields are forbidden ---------- */
      const emailField = page.getByRole("textbox", { name: /email/i });
      const passwordField = page.getByRole("textbox", { name: /password/i });
      const submitter = page.getByRole("button", { name: /sign up/i });

      await submitter.click();
      if (javaScriptEnabled) {
        await expectErrorFor(emailField, "Email is required");
        await expectErrorFor(passwordField, "Password is required");
      } else {
        await expect(emailField).toHaveJSProperty("validationMessage", "Please fill out this field.");
        await expect(passwordField).toHaveJSProperty("validationMessage", "Please fill out this field.");
      }

      /* ---------- Insecure passwords are forbidden ---------- */
      const securityError = "Password must contain at least 8 characters, including a number";

      // No letters (bad)
      await passwordField.fill("1".repeat(8));
      await submitter.click();
      if (javaScriptEnabled) await expectErrorFor(passwordField, securityError);
      else await expect(passwordField).toHaveJSProperty("validationMessage", "Please match the requested format.");

      // No numbers (bad)
      await passwordField.fill("a".repeat(8));
      await submitter.click();
      if (javaScriptEnabled) await expectErrorFor(passwordField, securityError);
      else await expect(passwordField).toHaveJSProperty("validationMessage", "Please match the requested format.");

      // Too short (bad)
      await passwordField.fill(`${"1".repeat(4)}${"a".repeat(3)}`);
      await submitter.click();
      if (javaScriptEnabled) await expectErrorFor(passwordField, securityError);
      else await expect(passwordField).toHaveJSProperty("validationMessage", "Please match the requested format.");

      // Secure Password (good)
      await passwordField.fill(password);
      await submitter.click();
      if (javaScriptEnabled) await expectValidField(passwordField);
      else await expect(passwordField).toHaveJSProperty("validity.valid", true);

      /* ---------- Invalid emails are forbidden ---------- */
      await emailField.fill("onion");
      await submitter.click();
      if (javaScriptEnabled) await expectErrorFor(emailField, "Email is invalid");
      else {
        await expect(emailField).toHaveJSProperty(
          "validationMessage",
          "Please include an '@' in the email address. 'onion' is missing an '@'.",
        );
      }

      await emailField.fill("onion@tasty.");
      await submitter.click();
      if (javaScriptEnabled) await expectErrorFor(emailField, "Email is invalid");
      else {
        await expect(emailField).toHaveJSProperty("validationMessage", "'.' is used at a wrong position in 'tasty.'.");
      }

      // Valid Email
      await passwordField.fill(""); // Note: This is done to verify that the `email`'s error messages get cleared

      await emailField.fill(email);
      await submitter.click();
      if (javaScriptEnabled) await expectValidField(emailField);
      else await expect(emailField).toHaveJSProperty("validity.valid", true);

      /* ---------- Valid email with a secure password ---------- */
      await passwordField.fill(password);
      await submitter.click();

      // Verify existence of access + refresh token
      await page.waitForURL(paths.home);
      const cookies = await context.cookies();
      expect(cookies.some((c) => c.name === "sAccessToken")).toBe(true);
      expect(cookies.some((c) => c.name === "sRefreshToken")).toBe(true);
    });

    it("Requires the provided email not to be associated with an existing account", async ({
      page,
      existingAccount,
    }) => {
      await visitSignUpPage(page);

      // Attempt to sign up with an existing account
      const email = page.getByRole("textbox", { name: /email/i });

      await email.fill(existingAccount.email);
      await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
      await page.getByRole("button", { name: /sign up/i }).click();
      await expectErrorFor(email, "This email already exists. Please sign in instead.");
    });
  });

  it.describe("User Logout", () => {
    it('Logs out the user when they click the `Logout` "button" (link)', async ({ page, context, existingAccount }) => {
      // Login
      await page.goto(paths.login);
      await page.getByRole("textbox", { name: /email/i }).fill(existingAccount.email);
      await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
      await page.getByRole("button", { name: /sign in/i }).click();

      // Verify existence of access + refresh token
      const logoutButton = page.getByRole("link", { name: /logout/i });
      await expect(logoutButton).toBeVisible();
      expect((await context.cookies()).some((c) => c.name === "sAccessToken")).toBe(true);
      expect((await context.cookies()).some((c) => c.name === "sRefreshToken")).toBe(true);

      // Logout
      await logoutButton.click();
      await expect(page.getByRole("heading", { level: 1, name: /sign in/i })).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(paths.login);

      // Verify absence of access token
      expect((await context.cookies()).some((c) => c.name === "sAccessToken")).toBe(false);
      expect((await context.cookies()).some((c) => c.name === "sRefreshToken")).toBe(false);
    });

    // NOTE: Testing this use case requires using a REVOKED, EXPIRED Access Token with a VALID Refresh Token.
    // (If revoked access tokens are IMMEDIATELY blacklisted, you shouldn't need to wait for access token expiration.)
    it("Forbids the use of access tokens that have been nullified by a User Logout", async ({
      page,
      context,
      existingAccount,
    }) => {
      // Login
      await page.goto(paths.login);
      await page.getByRole("textbox", { name: /email/i }).fill(existingAccount.email);
      await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
      await page.getByRole("button", { name: /sign in/i }).click();

      // Grab access + refresh tokens
      const logoutButton = page.getByRole("link", { name: /logout/i });
      await expect(logoutButton).toBeVisible();

      const accessToken = (await context.cookies()).find((c) => c.name === "sAccessToken") as Cookie;
      const refreshToken = (await context.cookies()).find((c) => c.name === "sRefreshToken") as Cookie;
      expect([accessToken, refreshToken]).toEqual([expect.anything(), expect.anything()]);

      // Logout
      await logoutButton.click();
      expect(new URL(page.url()).pathname).toBe(paths.login);
      expect((await context.cookies()).some((c) => c.name === "sAccessToken")).toBe(false);
      expect((await context.cookies()).some((c) => c.name === "sRefreshToken")).toBe(false);

      // Reapply revoked access token AND wait for expiration
      await context.addCookies([accessToken, refreshToken]);

      const waitTime = accessTokenExpiration;
      expect(waitTime).toBeLessThan(refreshTokenExpiration);
      await page.waitForTimeout(waitTime);

      // Attempt to visit a secure route
      await page.goto(paths.private);
      await expect(page.getByRole("heading", { level: 1, name: /sign in/i })).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(paths.login);
    });
  });

  it.describe("User Signin", () => {
    it("Enables users with an existing account to login, redirecting them to the home page", async ({
      page,
      existingAccount,
    }) => {
      // Login immediately
      await page.goto(paths.login);
      await page.getByRole("textbox", { name: /email/i }).fill(existingAccount.email);
      await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
      await page.getByRole("button", { name: /sign in/i }).click();

      // User should be returned to Home Page
      expect(new URL(page.url()).pathname).toBe(paths.home);
    });

    it("Returns users to the page they were trying to visit after authentication", async ({
      page,
      existingAccount,
    }) => {
      // Unauthenticated user is redirected to auth page
      const originalPath = paths.private;
      await page.goto(originalPath);
      await expect(page.getByRole("heading", { name: /sign in/i, level: 1 })).toBeVisible();

      // Login immediately
      await page.getByRole("textbox", { name: /email/i }).fill(existingAccount.email);
      await page.getByRole("textbox", { name: /password/i }).fill(existingAccount.password);
      await page.getByRole("button", { name: /sign in/i }).click();

      // User should be returned to ORIGINAL path, NOT the Home Page
      expect(new URL(page.url()).pathname).toBe(originalPath);
    });

    it("Rejects invalid email-password combinations", async ({ page, existingAccount }) => {
      await page.goto(paths.login);
      const email = page.getByRole("textbox", { name: /email/i });
      const password = page.getByRole("textbox", { name: /password/i });
      const submitter = page.getByRole("button", { name: /sign in/i });

      // An unrecognized email is rejected
      await email.fill(faker.internet.email());
      await password.fill(existingAccount.password);
      await submitter.click();

      const error = page.getByRole("alert").and(page.getByText("Incorrect email and password combination"));
      await expect(error).toBeVisible();

      // A recognized email with an unrecognized password is rejected
      await email.fill(existingAccount.email);
      await password.fill(faker.internet.password());
      await submitter.click();
      await expect(error).toBeVisible();

      // A valid email-password combination is accepted
      await email.fill(existingAccount.email);
      await password.fill(existingAccount.password);
      await submitter.click();
      await expect(error).not.toBeVisible();

      // User is redirected to home page with access to secure routes (like the Private Page)
      await page.waitForURL(paths.home);
      await expect(page.getByRole("link", { name: /private/i })).toBeVisible();
    });
  });

  it.describe("Authenticated User Management", () => {
    it("Allows authenticated users to interact with secure routes (like the Private Page)", async ({
      pageWithUser,
    }) => {
      // Visit Private Page AND submit Form
      const text = "This is some cool text";
      await pageWithUser.goto(paths.private);
      await pageWithUser.getByRole("textbox", { name: /text input/i }).fill(text);
      await pageWithUser.getByRole("button", { name: /submit/i }).click();

      // Verify that we got a response back from our form submission
      await expect(pageWithUser.getByText(JSON.stringify({ text }, null, 2))).toBeVisible();
    });

    it("Prevents authenticated users from visiting the Login Page (because they're already logged in)", async ({
      pageWithUser,
    }) => {
      // Attempt to revisit Login Page
      await pageWithUser.goto(paths.login);
      expect(new URL(pageWithUser.url()).pathname).toBe(paths.home);
    });

    it("Prevents authenticated users from visiting the Password Reset Page (because they're already logged in)", async ({
      pageWithUser,
    }) => {
      // Attempt to visit Password Reset Page
      await pageWithUser.goto(paths.passwordReset);
      expect(new URL(pageWithUser.url()).pathname).toBe(paths.home);
    });
  });

  it.describe("Session Refreshing", () => {
    it("Redirects unauthenticated users to the Login Page", async ({ page }) => {
      await page.goto(paths.refresh);
      await expect(page.getByRole("heading", { level: 1, name: /sign in/i })).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(paths.login);
    });

    const ProvidesNewTokensWhen = "Gives the user new Auth Tokens when they visit the Session Refresh Route";
    it(`${ProvidesNewTokensWhen} with Valid Access + Valid Refresh Tokens`, async ({ pageWithUser, context }) => {
      // Attempt token refresh
      const originalTokens = await getAuthTokens(context);
      await pageWithUser.goto(paths.refresh);
      await pageWithUser.waitForURL(paths.home);

      // Tokens should be different
      const newTokens = await getAuthTokens(context);
      expect(newTokens.accessToken).not.toStrictEqual(originalTokens.accessToken);
      expect(newTokens.refreshToken).not.toStrictEqual(originalTokens.refreshToken);

      // User should still be authenticated
      await pageWithUser.goto(paths.private);
      await expect(pageWithUser.getByText("Hello! This page is private!")).toBeVisible();
    });

    it(`${ProvidesNewTokensWhen} with Expired Access + Valid Refresh Tokens`, async ({ pageWithUser, context }) => {
      // Expire access token (but NOT refresh token)
      const originalTokens = await getAuthTokens(context);
      await pageWithUser.waitForTimeout(accessTokenExpiration);

      // Attempt token refresh
      await pageWithUser.goto(paths.refresh);
      await pageWithUser.waitForURL(paths.home);

      // Tokens should be different
      const newTokens = await getAuthTokens(context);
      expect(newTokens.accessToken).not.toStrictEqual(originalTokens.accessToken);
      expect(newTokens.refreshToken).not.toStrictEqual(originalTokens.refreshToken);

      // User should still be authenticated
      await pageWithUser.goto(paths.private);
      await expect(pageWithUser.getByText("Hello! This page is private!")).toBeVisible();
    });

    const RemovesAuthTokensWhen = "Removes the user's Auth Tokens when they visit the Session Refresh Route";
    it(`${RemovesAuthTokensWhen} without an Access Token`, async ({ pageWithUser, context }) => {
      // Attempt token refresh
      const tokens = await getAuthTokens(context);
      await context.clearCookies({ name: tokens.accessToken.name });
      await pageWithUser.goto(paths.refresh);

      // Tokens should be deleted
      await expectUserToBeUnauthenticated(context);
      expect(new URL(pageWithUser.url()).pathname).toBe(paths.login);
    });

    it(`${RemovesAuthTokensWhen} with an invalid Access Token`, async ({ pageWithUser, context }) => {
      // Attempt token refresh
      const tokens = await getAuthTokens(context);
      await context.clearCookies({ name: tokens.accessToken.name });
      await context.addCookies([{ ...tokens.accessToken, value: "MUDA_MUDA" }]);
      await pageWithUser.goto(paths.refresh);

      // Tokens should be deleted
      await expectUserToBeUnauthenticated(context);
      expect(new URL(pageWithUser.url()).pathname).toBe(paths.login);
    });

    it(`${RemovesAuthTokensWhen} with Expired Access + Missing Refresh Tokens`, async ({ pageWithUser, context }) => {
      // Attempt token refresh
      const originalTokens = await getAuthTokens(context);
      await context.clearCookies({ name: originalTokens.refreshToken.name });
      await pageWithUser.goto(paths.refresh);

      // Tokens should be deleted
      await pageWithUser.waitForURL(paths.login);
      await expectUserToBeUnauthenticated(context);
    });

    it(`${RemovesAuthTokensWhen} with Expired Access + Invalid Refresh Tokens`, async ({ pageWithUser, context }) => {
      // Attempt token refresh
      const originalTokens = await getAuthTokens(context);
      await context.clearCookies({ name: originalTokens.refreshToken.name });
      await context.addCookies([{ ...originalTokens.refreshToken, value: "ORA_ORA_ORA" }]);
      await pageWithUser.goto(paths.refresh);

      // Tokens should be deleted
      await pageWithUser.waitForURL(paths.login);
      await expectUserToBeUnauthenticated(context);
    });

    it(`${RemovesAuthTokensWhen} with Expired Access + Expired Refresh Tokens`, async ({ pageWithUser, context }) => {
      // Expire BOTH access token AND refresh token. Then attempt token refresh.
      await pageWithUser.waitForTimeout(refreshTokenExpiration);
      await pageWithUser.goto(paths.refresh);

      // Tokens should be deleted
      await pageWithUser.waitForURL(paths.login);
      await expectUserToBeUnauthenticated(context);
    });

    it(`${RemovesAuthTokensWhen} with Expired Access + Stolen Refresh Tokens`, async ({ pageWithUser, context }) => {
      // Attempt token refresh
      const originalTokens = await getAuthTokens(context);
      await pageWithUser.goto(paths.refresh);

      // Tokens should be different
      const newTokens = await getAuthTokens(context);
      expect(newTokens.accessToken).not.toStrictEqual(originalTokens.accessToken);
      expect(newTokens.refreshToken).not.toStrictEqual(originalTokens.refreshToken);

      // User should still be authenticated
      await pageWithUser.goto(paths.private);
      await expect(pageWithUser.getByText("Hello! This page is private!")).toBeVisible();

      // Attempt refresh again with PREVIOUSLY-USED refresh token
      expect(originalTokens.refreshToken.name).toBe(newTokens.refreshToken.name);
      await context.clearCookies({ name: newTokens.refreshToken.name });
      await context.addCookies([originalTokens.refreshToken]);
      await pageWithUser.goto(paths.refresh);

      // Tokens should be deleted
      await pageWithUser.waitForURL(paths.login);
      await expectUserToBeUnauthenticated(context);
    });

    it.describe("Automatic Session Refreshing", () => {
      it("Refreshes the user's session while they interact with secure routes", async ({ pageWithUser, context }) => {
        // Guarantee that we start on the Home Page
        await pageWithUser.goto(paths.home);
        const firstTokens = await getAuthTokens(context);

        // Expire access token (but NOT refresh token). Then visit a secure route.
        await pageWithUser.waitForTimeout(accessTokenExpiration);

        const sessionRefreshed = (r: Response) => new URL(r.url()).pathname === paths.refresh && r.status() === 307;
        const redirect1 = pageWithUser.waitForResponse(sessionRefreshed);

        await pageWithUser.goto(paths.private);
        await redirect1;

        // User should have been re-authenticated AND directed to their desired page
        const secondTokens = await getAuthTokens(context);
        expect(secondTokens.accessToken).not.toStrictEqual(firstTokens.accessToken);
        expect(secondTokens.refreshToken).not.toStrictEqual(firstTokens.refreshToken);
        expect(new URL(pageWithUser.url()).pathname).toBe(paths.private);

        // Expire ONLY access token again. Then perform a `POST` request (via form submission).
        const text = "This is some test text...";
        await pageWithUser.getByRole("textbox", { name: /text input/i }).fill(text);
        await pageWithUser.waitForTimeout(accessTokenExpiration);

        const submitter = pageWithUser.getByRole("button", { name: /submit/i });
        await expect(submitter).toHaveJSProperty("form.method", "post");

        const redirect2 = pageWithUser.waitForResponse(sessionRefreshed);
        await pageWithUser.getByRole("button", { name: /submit/i }).click();
        await redirect2;

        // User should have been re-authenticated, AND their form submission should have succeeded.
        const thirdTokens = await getAuthTokens(context);
        expect(thirdTokens.accessToken).not.toStrictEqual(secondTokens.accessToken);
        expect(thirdTokens.refreshToken).not.toStrictEqual(secondTokens.refreshToken);

        // Verify that we got a response back from our form submission
        expect(new URL(pageWithUser.url()).pathname).toBe(paths.private);
        await expect(pageWithUser.getByText(JSON.stringify({ text }, null, 2))).toBeVisible();
      });
    });
  });

  it.describe("Miscellaneous Auth Requirements", () => {
    it("Deletes the user's Auth Tokens if they interact with a secure route without a Valid Access Token", async ({
      pageWithUser,
      context,
    }) => {
      // Attempt to `POST` to a secure route (via a form submission) WITHOUT an Access Token
      await pageWithUser.goto(paths.private);
      await pageWithUser.getByRole("textbox", { name: /text input/i }).fill("Some text...");

      const tokens = await getAuthTokens(context);
      await context.clearCookies({ name: tokens.accessToken.name });
      await pageWithUser.getByRole("button", { name: /submit/i }).click();

      // Tokens should be deleted
      await expectUserToBeUnauthenticated(context);
      expect(new URL(pageWithUser.url()).pathname).toBe(paths.login);

      // Now attempt to visit a secure route with an Invalid Access Token
      await context.addCookies([{ ...tokens.accessToken, value: "POWER!" }, tokens.refreshToken]);
      await pageWithUser.goto(paths.private);

      // Tokens should be deleted again
      await expectUserToBeUnauthenticated(context);
      expect(new URL(pageWithUser.url()).pathname).toBe(paths.login);
    });
  });
});
