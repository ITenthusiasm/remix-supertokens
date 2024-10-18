import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";
import Passwordless from "supertokens-node/recipe/passwordless/index.js";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import Session from "supertokens-node/recipe/session/index.js";
import type { Tokens, CodeDetails } from "~/utils/supertokens/cookieHelpers.server";
import { commonRoutes } from "~/utils/constants";

type AuthDetails = { tokens: Tokens };

// `EmailPassword` Helper Types
type SignInResult =
  | ({ status: "WRONG_CREDENTIALS_ERROR" } & { [K in keyof AuthDetails]?: undefined })
  | ({ status: "OK" } & AuthDetails);

type SignUpResult =
  | ({ status: "EMAIL_ALREADY_EXISTS_ERROR" } & { [K in keyof AuthDetails]?: undefined })
  | ({ status: "OK" } & AuthDetails);

// `Passwordless` Helper Types
export type PasswordlessFlow = "link" | "code" | "both";
type PasswordlessEmailInfo = { email: string; flow: PasswordlessFlow };
type PasswordlessPhoneInfo = { phoneNumber: string; flow: PasswordlessFlow };
type PasswordlessCredentials =
  | (CodeDetails & { userInputCode: string })
  | (Pick<CodeDetails, "preAuthSessionId"> & { linkCode: string });

type BadPasswordlessSignInStatuses = Exclude<Awaited<ReturnType<typeof Passwordless.consumeCode>>["status"], "OK">;
type PasswordlessSignInResult =
  | ({ status: "OK" } & AuthDetails)
  | ({ status: BadPasswordlessSignInStatuses } & { [K in keyof AuthDetails]?: undefined });

// `ThirdParty` Helper Types
type RedirectDetails = { redirectUrl: string; pkceCodeVerifier?: string };
type BadThirdPartySignInStatuses = Exclude<
  Awaited<ReturnType<typeof ThirdParty.manuallyCreateOrUpdateUser>>["status"],
  "OK"
>;

type ThirdPartySignInResult =
  | ({ status: "OK" } & AuthDetails)
  | ({
      status: BadThirdPartySignInStatuses | "UNRECOGNIZED_PROVIDER" | "NO_EMAIL_FOUND_FOR_USER" | "EMAIL_NOT_VERIFIED";
    } & { [K in keyof AuthDetails]?: undefined });

// Misc. Helper Types and Constants
type TokensForLogout = Pick<Tokens, "accessToken" | "antiCsrfToken">;
type TokensForRefresh = { refreshToken: string; antiCsrfToken?: string };
type ResetPasswordStatus = Awaited<ReturnType<(typeof EmailPassword)["resetPasswordUsingToken"]>>["status"];
const tenantId = "public"; // Default tenantId for `SuperTokens`

const SuperTokensHelpers = {
  /* -------------------- Session / General Helpers -------------------- */
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

  async emailExists(email: string): Promise<boolean> {
    const users = await SuperTokens.listUsersByAccountInfo(tenantId, { email });
    return Boolean(users.length);
  },

  /* -------------------- EmailPassword Helpers -------------------- */
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
    const passwordResetLink = `${process.env.DOMAIN}${passwordResetPath}?token=${tokenResult.token}&rid=emailpassword`;
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

  /* -------------------- Passwordless Helpers  -------------------- */
  async sendPasswordlessInvite(info: PasswordlessEmailInfo | PasswordlessPhoneInfo): Promise<CodeDetails> {
    // Note: Although both `email` and `phoneNumber` are destructured here, only ONE of them should be present.
    const { email, phoneNumber, flow } = info as PasswordlessEmailInfo & PasswordlessPhoneInfo;
    if (email != null && phoneNumber != null) {
      throw new TypeError("You may provide an email OR a phone number, but not both");
    }

    const { userInputCode, ...code } = await Passwordless.createCode({ email, phoneNumber, tenantId });
    const link = `${process.env.DOMAIN}${commonRoutes.loginPasswordless}?token=${code.linkCode}`;
    const communicationChannel = email ? "Email" : "Sms";

    await Passwordless[`send${communicationChannel}`]({
      email,
      phoneNumber,
      tenantId,
      isFirstFactor: true,
      type: "PASSWORDLESS_LOGIN",
      ...code,
      userInputCode: flow === "link" ? undefined : userInputCode,
      urlWithLinkCode: flow === "code" ? undefined : link,
    });

    return code;
  },

  async passwordlessSignin(credentials: PasswordlessCredentials): Promise<PasswordlessSignInResult> {
    const result = await Passwordless.consumeCode({ tenantId, ...credentials });
    const status = result.status;
    if (status !== "OK") return { status };

    const { recipeUserId } = result;
    const session = await Session.createNewSessionWithoutRequestResponse(tenantId, recipeUserId);
    return { status, tokens: session.getAllSessionTokensDangerously() };
  },

  /* -------------------- ThirdParty Helpers  -------------------- */
  async getThirdPartyRedirectDetails(providerId: string, returnUrl: string | null): Promise<RedirectDetails | null> {
    // NOTE: You might need to pass a defined `clientType` to `getProvider` in some cases
    const provider = await ThirdParty.getProvider(tenantId, providerId, undefined);
    if (!provider) return null;

    const { urlWithQueryParams, pkceCodeVerifier } = await provider.getAuthorisationRedirectURL({
      userContext: undefined as any,
      redirectURIOnProviderDashboard: createReturnURLForProvider(providerId, returnUrl),
    });

    return { redirectUrl: urlWithQueryParams, pkceCodeVerifier };
  },

  async thirdPartySignin(
    providerCredentials: URLSearchParams,
    pkceCodeVerifier: string | undefined,
  ): Promise<ThirdPartySignInResult> {
    // NOTE: You might need to pass a defined `clientType` to `getProvider` in some cases
    const providerId = providerCredentials.get("provider") ?? "";
    const provider = await ThirdParty.getProvider(tenantId, providerId, undefined);
    if (!provider) return { status: "UNRECOGNIZED_PROVIDER" } as const;

    const oAuthTokens = await provider.exchangeAuthCodeForOAuthTokens({
      userContext: undefined as any,
      redirectURIInfo: {
        pkceCodeVerifier,
        redirectURIQueryParams: Object.fromEntries(providerCredentials),
        redirectURIOnProviderDashboard: createReturnURLForProvider(providerId, providerCredentials.get("returnUrl")),
      },
    });

    const userInfoFromProvider = await provider.getUserInfo({ oAuthTokens, userContext: undefined as any });
    const { thirdPartyUserId, email } = userInfoFromProvider;
    if (!email) return { status: "NO_EMAIL_FOUND_FOR_USER" } as const;
    if (!email.isVerified) return { status: "EMAIL_NOT_VERIFIED" } as const;

    const result = await ThirdParty.manuallyCreateOrUpdateUser(
      tenantId,
      providerId,
      thirdPartyUserId,
      email.id,
      email.isVerified,
    );

    const status = result.status;
    if (status !== "OK") return { status };

    const { recipeUserId } = result;
    const session = await Session.createNewSessionWithoutRequestResponse(tenantId, recipeUserId);
    return { status, tokens: session.getAllSessionTokensDangerously() };
  },
};

/**
 * @param providerId
 * @param returnUrl The URL `path` that the user should be redirected to after authentication succeeds
 */
function createReturnURLForProvider(providerId: string, returnUrl?: string | null): string {
  let url = `${process.env.DOMAIN}${commonRoutes.loginThirdParty}?provider=${providerId}`;
  if (returnUrl) url += `&returnUrl=${returnUrl}`;
  return url;
}

export default SuperTokensHelpers;
