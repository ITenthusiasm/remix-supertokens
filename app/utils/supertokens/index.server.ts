import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
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
type ResetPasswordStatus = Awaited<ReturnType<(typeof EmailPassword)["resetPasswordUsingToken"]>>["status"];
const recipeId = "emailpassword";
const tenantId = "public"; // Default tenantId for `SuperTokens`

const SuperTokensHelpers = {
  async signin(email: string, password: string): Promise<SignInResult> {
    const signinResult = await EmailPassword.signIn(tenantId, email, password);
    if (signinResult.status === "WRONG_CREDENTIALS_ERROR") return { status: signinResult.status };

    const { status, user } = signinResult;
    const recipeUserId = SuperTokens.convertToRecipeUserId(user.id);
    const session = await Session.createNewSessionWithoutRequestResponse(tenantId, recipeUserId);
    return { status, tokens: session.getAllSessionTokensDangerously() };
  },

  async signup(email: string, password: string): Promise<SignUpResult> {
    const signupResult = await EmailPassword.signUp(tenantId, email, password);
    if (signupResult.status === "EMAIL_ALREADY_EXISTS_ERROR") return { status: signupResult.status };

    const { status, user } = signupResult;
    const recipeUserId = SuperTokens.convertToRecipeUserId(user.id);
    const session = await Session.createNewSessionWithoutRequestResponse(tenantId, recipeUserId);
    return { status, tokens: session.getAllSessionTokensDangerously() };
  },

  async emailExists(email: string): Promise<boolean> {
    return SuperTokens.listUsersByAccountInfo(tenantId, { email }).then((users) => Boolean(users.length));
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
      if (!Session.Error.isErrorFromSuperTokens(error)) throw error;
      if (error.payload.sessionHandle) Session.revokeSession(error.payload.sessionHandle);
      return {};
    }
  },

  // NOTE: Fails silently for unknown emails intentionally
  async sendPasswordResetEmail(email: string): Promise<void> {
    // NOTE: Assumes that an email is associated with only 1 user/account
    const [user] = await SuperTokens.listUsersByAccountInfo(tenantId, { email });
    if (!user) return console.log(`Password reset email not sent to unrecognized address: ${email}`);

    const tokenResult = await EmailPassword.createResetPasswordToken(tenantId, user.id, email);
    if (tokenResult.status === "UNKNOWN_USER_ID_ERROR") {
      return console.log(`Password reset email not sent, unknown user id: ${user.id}`);
    }

    const passwordResetPath = commonRoutes.resetPassword;
    const passwordResetLink = `${process.env.DOMAIN}${passwordResetPath}?token=${tokenResult.token}&rid=${recipeId}`;
    return EmailPassword.sendEmail({
      type: "PASSWORD_RESET",
      tenantId,
      user: { id: user.id, recipeUserId: SuperTokens.convertToRecipeUserId(user.id), email },
      passwordResetLink,
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordStatus> {
    const { status } = await EmailPassword.resetPasswordUsingToken(tenantId, token, newPassword);
    return status;
  },
};

export default SuperTokensHelpers;
