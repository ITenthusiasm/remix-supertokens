# TODO

- [ ] Add an example of how to get everything up an running with a PostgreSQL database.
- [ ] Cleanup code and make it less trash. (ongoing)
  - [ ] Should we handle non-200 error responses from SuperTokens?
    - (These errors likely will not happen unless someone tries to interact with our app OUTSIDE of the UI we offer. In such cases, it may not make sense to give descriptive error messages? Our app is not an API. Remix has error boundaries... so maybe we just leave it to Remix?)
  - [x] Maybe add types for `Remix Context` / `User`?
  - [x] "Field is not optional" is a bad notification for screen readers because it is too ambiguous when the message is announced.
  - [ ] Especially scrutinize `login.tsx` and `reset-password.tsx` for cleanup.
    - Routes checklist:
      - [ ] `/auth/session/refresh`
      - [x] `/`
      - [ ] `/login`
      - [ ] `/logout`
      - [x] `/private`
      - [ ] `/reset-password`
- [ ] **REPLACE** the `SuperTokens` `getAllCORSHeaders` middleware function with an implementation that _does not_ require using middleware if possible. (We need this for things like `SvelteKit` and `SolidStart`). (Is this needed?)
