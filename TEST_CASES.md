# Test Cases

These are the test cases used to make sure that the SuperTokens authentication features are working properly across the application. All of the details defined here should be possible with this app.

## All Users

- [x] All users can visit pages/routes that don't require authentication, such as the following:
  - [x] The home page (`/`)

## Unauthenticated Users

- [x] Unauthenticated users _cannot_ visit pages that require authentication, such as the `/private` page.
  - [x] When an unauthenticated user visits a page requiring authentication, they will be redirected to the `/login` page. A successful login will return them to the page they were initially trying to visit (assuming they kept the same browser session without changing the URL).

## Signup

- [x] Users can sign up on the `/login` page. Doing so will create a new account for them and redirect them to the home page.
- [x] A user who has an existing account cannot sign up again using the same email. They must login instead.
- [x] A user cannot create a new account unless their password is sufficiently secure. (You can adjust the security requirements if you want. We're only using the default requirements from SuperTokens.)

## Logout

- [x] Authenticated users can logout of their account by visiting the `/logout` route. Doing so will clear their tokens and redirect them to the `/login` page.
  - [x] When a user logs out, their session will be revoked. The same tokens for the session can no longer be used for authentication purposes.
    - **Note**: By default, access tokens provided by SuperTokens will still be usable until they expire _even if the session was revoked_. See [_Revoking a Session_](https://supertokens.com/docs/thirdparty/common-customizations/sessions/revoke-session). For more aggressive behavior that _immediately_ bans access tokens belonging to revoked sessions, see [_Access Token Blacklisting_](https://supertokens.com/docs/thirdparty/common-customizations/sessions/access-token-blacklisting).

## Signin/Login

- [x] Logging in with an existing account should start a new session for a user and redirect them to the home page.
- [x] Logging in with an invalid email-password combination should not work.
  - You can consider the following invalid email-password combinations:
    - [x] A combination where the `email` does not correspond to an existing account.
    - [x] A combination where the `password` does not correspond to the user having the provided `email`.

## Authenticated Users

- [x] Authenticated users are allowed to visit (or make POST requests to) authenticated routes.
- [x] Authenticated users _cannot_ visit the `/login` page (because they're already logged in). They will simply be redirected to the home page.
- [x] Authenticated users _cannot_ visit the `/reset-password` page (because they've already proved that they know their password). They will simply be redirected to the home page.

## Session Refreshing

- [x] If an _authenticated_ user visits the `/auth/session/refresh` route with a _valid_ **access** token and a _valid_ **refresh** token, they will be given new auth tokens and get redirected to the home page.
- [x] If an _authenticated_ user visits the `/auth/session/refresh` route with an _expired_ **access** token and a _valid_ **refresh** token, they will be given new auth tokens and get redirected to the home page.
- [x] If a user visits the `/auth/session/refresh` page with an _expired_ **access** token and an _invalid_ (**OR** _expired_) **refresh** token, their tokens will be removed and they will be redirected to the `/login` page.
  - You can consider the following to be invalid refresh tokens:
    - A refresh token that is stolen
      - [x] For stolen refresh tokens, the corresponding session will be revoked, meaning that any users relying on this session will be logged out immediately.
    - A refresh token that has an invalid value (e.g., `1` or some other token value not recognized by the server)
    - A missing refresh token
- [x] If a user visits the `/auth/session/refresh` page _without_ a valid access token, their tokens will be removed and they will be redirected to the `/login` page (**even if they had a valid refresh token**).
  - You can consider the following to be invalid access tokens:
    - An access token that has an invalid value (e.g., `1` or some other token value not recognized by the server)
    - A missing access token
- [x] If an _unauthenticated_ user visits the `/auth/session/refresh` page, they will be redirected to the `/login` page.

## Automated Session Refreshing

- [x] If an _authenticated_ user visits an authenticated route with an _expired_ **access** token, they will be redirected to the `/auth/session/refresh` route. (See [Session Refreshing](#session-refreshing) for what happens during that route visit.)
  - [x] **If session refreshing is successful**, the authenticated user will be returned to the page that they were trying to visit (instead of the home page).
- [x] If an _authenticated_ user attempts to submit a form to an authenticated route with an _expired_ **access** token, they will be redirected to the `/auth/session/refresh` route. (See [Session Refreshing](#session-refreshing) for what happens during that route visit.)
  - [x] **If session refreshing is successful**, the user's form submission will _continue_ on the page that they were previously on.

## Miscellaneous Auth Requirements

- [x] When a user visits (or otherwise interacts with) an authenticated route _without_ a valid access token, their tokens will be removed and they will be redirected to the `/login` page -- **even if they had a valid refresh token**. (Note that expired access tokens are still considered "valid" and will result in the user being sent to the `/auth/session/refresh` page.)

## Password Resets

- When a user requests a reset password link ...
  - [x] If there is no account associated with the provided email address, then no reset password link will be sent to that email address.
  - [x] If there _is_ an account associated with the provided email address, then a password reset link _will_ be sent to that email address.
- [x] After a successful password reset, the user must login with their new password. The old password will no longer work.
- [x] A password reset will _fail_ if the password is not sufficiently secure.
- [x] A password reset will _fail_ if the password confirmation does not match the new password.
- [x] A password reset will _fail_ if an _invalid_ password reset link is used.
  - You can consider the following to be invalid reset password links:
    - Any link that uses an invalid password reset token (e.g., `1` or some other token value not recognized by the server).
    - Any link that attempts to use an _expired_ password reset token.
      - A password reset token may be expired because it was already used **or** because too much time passed before it was used.
    - Any link with a missing password reset token. (That is, any link that doesn't have the `token` query parameter.)

---

## Potential Approaches to Testing Different Scenarios

### Reusing Old Tokens after a Logout

To test the scenario where a user attempts to use tokens that belong to a _logged out_ session, simply update the server logic for the `/logout` route so that it doesn't update the user's cookies. This will cause the user's cookies to remain as they were after the logout (thereby leaving them with cookies belonging to a revoked session). Once their access token expires, the user should no longer be able to visit authenticated pages. (If you've configured the app to be [more aggressive](https://supertokens.com/docs/thirdparty/common-customizations/sessions/access-token-blacklisting) with access tokens, then the user should be blocked from authenticated routes immediately.)

### Expired Access Token with Valid Refresh Token

Update the settings of your SuperTokens Core instance so that the access token expires more quickly.

### Expired Access Token with Expired Refresh Token

Update the settings of your SuperTokens Core instance so that the access token _and_ the refresh token expire more quickly.

### Simulating a Stolen Refresh Token during a Session Refresh

This is pretty similar to the approach for [Reusing Old Tokens after a Logout](#reusing-old-tokens-after-a-logout). You'll need to update the server logic for the `/auth/session/refresh` route so that it doesn't update the _refresh token_ after a _successful_ session refresh. This will leave the user with a new access token and the _old_ refresh token. Visit the `/auth/session/refresh` route again. Now, a token theft should be detected, their session should be revoked, their cookies should be cleared, and they should be sent to the `/login` page. (Remember the caveat with access tokens mentioned earlier: Unless you configure the app to be more strict, an access token belonging to a revoked session will remain usable until it expires.)

### Simulating an Action Requiring Authentication with a Missing Access Token and a Valid Refresh Token

Login to start a new user session. Next, delete the access token from the browser using the developer tools. Finally, attempt the action that requires authentication. The action should fail, the auth cookies should be cleared, and the user should be redirected to the `/login` page.

### Automated Session Refreshing during Form Submissions

The form on the `/private` page was provided exactly for this test case. Simply use that.
