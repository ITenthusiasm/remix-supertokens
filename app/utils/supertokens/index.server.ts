import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import SuperTokensError from "supertokens-node/lib/build/error";
import type { Tokens } from "~/utils/supertokens/cookieHelpers.server";
import { commonRoutes } from "~/utils/constants";

type AuthDetails = { tokens: Tokens };

type SignInResult =
  | ({ status: "WRONG_CREDENTIALS_ERROR" } & { [K in keyof AuthDetails]?: undefined })
  | ({ status: "OK" } & AuthDetails);

type SignUpResult =
  | ({ status: "EMAIL_ALREADY_EXISTS_ERROR" } & { [K in keyof AuthDetails]?: undefined })
  | ({ status: "OK" } & AuthDetails);

type TokensForLogout = Pick<Tokens, "accessToken" | "antiCsrfToken">;
type TokensForRefresh = { refreshToken: string; antiCsrfToken?: string };
type ResetPasswordStatus = Awaited<ReturnType<typeof EmailPassword["resetPasswordUsingToken"]>>["status"];
const recipeId = "emailpassword";

const SuperTokensHelpers = {
  async signin(email: string, password: string): Promise<SignInResult> {
    const signinResult = await EmailPassword.signIn(email, password);
    if (signinResult.status === "WRONG_CREDENTIALS_ERROR") return { status: signinResult.status };

    const { status, user } = signinResult;
    const session = await Session.createNewSessionWithoutRequestResponse(user.id);
    return { status, tokens: session.getAllSessionTokensDangerously() };
  },

  async signup(email: string, password: string): Promise<SignUpResult> {
    const signupResult = await EmailPassword.signUp(email, password);
    if (signupResult.status === "EMAIL_ALREADY_EXISTS_ERROR") return { status: signupResult.status };

    const { status, user } = signupResult;
    const session = await Session.createNewSessionWithoutRequestResponse(user.id);
    return { status, tokens: session.getAllSessionTokensDangerously() };
  },

  async emailExists(email: string): Promise<boolean> {
    return EmailPassword.getUserByEmail(email).then(Boolean);
  },

  async logout({ accessToken, antiCsrfToken }: TokensForLogout): Promise<void> {
    const session = await Session.getSessionWithoutRequestResponse(accessToken, antiCsrfToken);
    return session.revokeSession();
  },

  async refreshToken({ refreshToken, antiCsrfToken }: TokensForRefresh): Promise<Partial<Tokens>> {
    try {
      const session = await Session.refreshSessionWithoutRequestResponse(refreshToken, undefined, antiCsrfToken);
      return session.getAllSessionTokensDangerously();
    } catch (error) {
      if (!SuperTokensError.isErrorFromSuperTokens(error)) throw error;
      if (error.payload.sessionHandle) Session.revokeSession(error.payload.sessionHandle);
      return {};
    }
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

export default SuperTokensHelpers;
