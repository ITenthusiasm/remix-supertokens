import { serialize } from "cookie";
import { commonRoutes } from "../constants.js";

/** @typedef {Omit<import("cookie").CookieSerializeOptions, "encode">} CookieSettings */

/** @typedef {Pick<
  ReturnType<
    import("supertokens-node/lib/build/recipe/session/types")
      .SessionContainerInterface["getAllSessionTokensDangerously"]
  >, "accessToken" | "refreshToken" | "antiCsrfToken"
>} Tokens */

/** @typedef {Pick<
  Awaited<ReturnType<import("supertokens-node/recipe/passwordless")["createCode"]>>, "deviceId" | "preAuthSessionId"
>} CodeDetails */

/** The `name`s of the `SuperTokens` cookies used throughout the application */
export const authCookieNames = Object.freeze({ access: "sAccessToken", refresh: "sRefreshToken", csrf: "sAntiCsrf" });

/** The `name`s of the cookies used to store `SuperTokens`'s Passwordless data for a given device */
export const deviceCookieNames = Object.freeze({ deviceId: "sDeviceId", preAuthSessionId: "sPreAuthSessionId" });
const oneYearInMilliseconds = 365 * 24 * 60 * 60 * 1000;

/** @satisfies {CookieSettings} */
const commonCookieSettings = Object.freeze({
  httpOnly: true,
  secure: process.env.SUPERTOKENS_WEBSITE_DOMAIN?.startsWith("https") ?? false,
  sameSite: "strict",
  priority: "high",
});

/**
 * Generates the [settings](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#attributes)
 * for a _new_ `SuperTokens` HTTP Cookie
 *
 * @param {keyof typeof authCookieNames} [type] The type of cookie for which the settings are being generated
 * @returns {CookieSettings}
 */
export function createCookieSettings(type) {
  const nextYear = new Date(new Date().getTime() + oneYearInMilliseconds);

  /*
   * Note: SuperTokens is responsible for enforcing the expiration dates, not the browser. Just make sure
   * that the cookie lives long enough in the browser for SuperTokens to be able to receive it and validate it.
   */
  return { expires: nextYear, path: type === "refresh" ? commonRoutes.refreshSession : "/", ...commonCookieSettings };
}

/** @satisfies {CookieSettings} */
export const deleteCookieSettings = Object.freeze({ expires: new Date(0), path: "/" });
export const deleteRefreshSettings = Object.freeze({ ...deleteCookieSettings, path: commonRoutes.refreshSession });

/**
 * Generates the HTTP Headers needed to store the `SuperTokens` auth tokens in the user's browser as cookies.
 * An empty token in `tokens` indicates that its corresponding cookie should be removed from the browser.
 * For example, if `tokens` is an empty object, then _all_ SuperTokens cookies will be deleted from the browser.
 *
 * @param {Partial<Tokens>} tokens
 * @returns {Headers}
 */
export function createHeadersFromTokens(tokens) {
  const headers = new Headers();
  const headerName = "Set-Cookie";
  const { accessToken, refreshToken, antiCsrfToken } = tokens;

  if (!accessToken) headers.append(headerName, serialize(authCookieNames.access, "", deleteCookieSettings));
  else headers.append(headerName, serialize(authCookieNames.access, accessToken, createCookieSettings()));

  if (!refreshToken) headers.append(headerName, serialize(authCookieNames.refresh, "", deleteRefreshSettings));
  else headers.append(headerName, serialize(authCookieNames.refresh, refreshToken, createCookieSettings("refresh")));

  if (!antiCsrfToken) headers.append(headerName, serialize(authCookieNames.csrf, "", deleteCookieSettings));
  else headers.append(headerName, serialize(authCookieNames.csrf, antiCsrfToken, createCookieSettings()));

  return headers;
}

/**
 * Generates the HTTP Headers needed to store `SuperTokens`'s Passwordless details for a given user's device
 * in their browser as cookies. An empty property in the `code` object indicates that its corresponding cookie
 * should be removed from the browser. For example, if `code` is an empty object, then _all_ of the SuperTokens
 * cookies related to a device using Passwordless login will be removed.
 *
 * @param {Partial<CodeDetails>} code
 * @returns {Headers}
 */
export function createHeadersFromPasswordlessCode(code) {
  const headers = new Headers();
  const headerName = "Set-Cookie";
  const { deviceId, preAuthSessionId } = code;

  if (!deviceId) headers.append(headerName, serialize(deviceCookieNames.deviceId, "", deleteCookieSettings));
  else headers.append(headerName, serialize(deviceCookieNames.deviceId, deviceId, createCookieSettings()));

  if (!preAuthSessionId) {
    headers.append(headerName, serialize(deviceCookieNames.preAuthSessionId, "", deleteCookieSettings));
  } else {
    headers.append(headerName, serialize(deviceCookieNames.preAuthSessionId, preAuthSessionId, createCookieSettings()));
  }

  return headers;
}
