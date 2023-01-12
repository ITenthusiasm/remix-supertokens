import type { HTTPMethod } from "supertokens-node/lib/build/types";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import { commonRoutes } from "~/utils/constants";
import SuperTokensDataInput from "./SuperTokensDataInput.server";
import SuperTokensDataOutput from "./SuperTokensDataOutput.server";

export * from "./headersHelpers.server";

/* -------------------- Utility Classes -------------------- */
export const SuperTokensData = { Input: SuperTokensDataInput, Output: SuperTokensDataOutput };

/* -------------------- Utility Functions -------------------- */
type HeadersDetails = { cookies: Map<string, string>; responseHeaders: Map<string, string | string[]> };

type SignInResult =
  | ({ status: "WRONG_CREDENTIALS_ERROR" } & { [K in keyof HeadersDetails]?: undefined })
  | ({ status: "OK" } & HeadersDetails);

type SignUpResult =
  | ({ status: "EMAIL_ALREADY_EXISTS_ERROR" } & { [K in keyof HeadersDetails]?: undefined })
  | ({ status: "OK" } & HeadersDetails);

type ResetPasswordStatus = Awaited<ReturnType<typeof EmailPassword["resetPasswordUsingToken"]>>["status"];
const recipeId = "emailpassword";

export const SuperTokensHelpers = {
  async signin(email: string, password: string): Promise<SignInResult> {
    const signinResult = await EmailPassword.signIn(email, password);
    if (signinResult.status === "WRONG_CREDENTIALS_ERROR") return { status: signinResult.status };

    const { status, user } = signinResult;
    const output = new SuperTokensData.Output();
    await Session.createNewSession(output, user.id);
    return { status, cookies: output.cookies, responseHeaders: output.responseHeaders };
  },

  async signup(email: string, password: string): Promise<SignUpResult> {
    const signupResult = await EmailPassword.signUp(email, password);
    if (signupResult.status === "EMAIL_ALREADY_EXISTS_ERROR") return { status: signupResult.status };

    const { status, user } = signupResult;
    const output = new SuperTokensData.Output();
    await Session.createNewSession(output, user.id);
    return { status, cookies: output.cookies, responseHeaders: output.responseHeaders };
  },

  async emailExists(email: string): Promise<boolean> {
    return EmailPassword.getUserByEmail(email).then(Boolean);
  },

  /**
   * @param headers The headers from the request object
   * @param method The HTTP method of the request
   */
  async logout(headers: Headers, method: HTTPMethod): Promise<HeadersDetails> {
    const input = new SuperTokensData.Input({ headers: new Map(headers), method });
    const output = new SuperTokensData.Output();

    const session = await Session.getSession(input, output, { sessionRequired: false });
    await session?.revokeSession(); // This implicitly clears the auth cookies from `output`
    return { cookies: output.cookies, responseHeaders: output.responseHeaders };
  },

  /**
   * @param headers The headers from the request object
   */
  async refreshToken(headers: Headers): Promise<HeadersDetails> {
    const input = new SuperTokensData.Input({ headers: new Map(headers) });
    const output = new SuperTokensData.Output();

    await Session.refreshSession(input, output);
    return { cookies: output.cookies, responseHeaders: output.responseHeaders };
  },

  // NOTE: Fails silently for unknown emails intentionally
  async sendPasswordResetEmail(email: string): Promise<void> {
    const user = await EmailPassword.getUserByEmail(email);
    if (!user) return console.log(`Password reset email not sent, unknown email: ${email}`);

    const tokenResult = await EmailPassword.createResetPasswordToken(user.id);
    if (tokenResult.status === "UNKNOWN_USER_ID_ERROR") {
      return console.log(`Password reset email not sent, unknown user id: ${user.id}`);
    }

    const passwordResetPath = commonRoutes.resetPassword;
    const passwordResetLink = `${process.env.DOMAIN}${passwordResetPath}?token=${tokenResult.token}&rid=${recipeId}`;
    await EmailPassword.sendEmail({ type: "PASSWORD_RESET", user, passwordResetLink });
  },

  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordStatus> {
    const { status } = await EmailPassword.resetPasswordUsingToken(token, newPassword);
    return status;
  },
};
