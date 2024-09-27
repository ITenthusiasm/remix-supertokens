/** Commonly referenced routes throughout the app */
export const commonRoutes = /** @type {const} */ ({
  login: "/login",
  resetPassword: "/reset-password",
  refreshSession: "/auth/session/refresh",
  emailExists: "/api/email-exists",
  loginPasswordless: "/passwordless/login",
});

/** @type {string[]} Page routes related to authentication. */
export const authPages = [
  commonRoutes.login,
  commonRoutes.resetPassword,
  commonRoutes.refreshSession,
  commonRoutes.emailExists,
  commonRoutes.loginPasswordless,
];
