# Suggestions for Improvements on the `supertokens-node` Codebase

1. Update the return type of `EmailPassword.signIn` to include `{ user: undefined }` in the error case. This will allow for an early destructure of the return type (while still allowing for type checking).
2. Simplify the `getCookieValueToSetInHeader` method in the `supertokens-node` repo to be more readable/understandable. (Maybe some early return statements can help? And/Or less mutations with `let` variables?)
3. Don't hide the `clearSessionCookie` within the `revokeSession` function. Instead, `revokeSession` should return the appropriate response `Headers` to clear the cookies. (It could perhaps receive these headers from `clearSessionCookie` if needed, and then immediately return those headers.)
4. The `TRY_REFRESH_TOKEN` general error in `/ts/recipe/session/accessToken` is rather misleading. Perhaps prefer a generic error over a specific-but-inaccurate one. (**Update**: This has been discussed briefly on Discord.)
5. For `verifyJWTAndGetPayload`, consider running `decodeURIComponent` on the token itself instead of requiring the end user to do it (unless I'm missing something).
   - **Edit**: This is probably framework-specific rather than `SuperTokens`-specific. Should we try to run a decode ourselves just in case another framework/server does something unexpected?
