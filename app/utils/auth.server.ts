/* This file mainly holds constants and helper functions related to auth */

/** Base URL for making auth-related requests */
export const baseAuthUrl = `${process.env.DOMAIN}${process.env.SUPERTOKENS_API_BASE_PATH}`;

export interface SuperTokensSessionError {
  type: "TRY_REFRESH_TOKEN" | "UNAUTHORISED";
  message: string;
  payload: Record<string, unknown>;
  errMagic: string;
  fromRecipe: string;
}
