# TODO

- [ ] Add `useFormLocalStorage` hook to `React Discoveries` with valid tests.
- [ ] Improve `README.md` for developers trying to use this as an example.
  - Maybe add more documentation too?
- [ ] Add an example of how to get everything up an running with a PostgreSQL database.
- [ ] Cleanup code and make it less trash. (ongoing)
  - [ ] Should we handle non-200 error responses from SuperTokens?
  - [ ] Maybe add types for `Remix Context` / `User`?
  - [ ] "Field is not optional" is a bad notification for screen readers because it is too ambiguous when the message is announced.
  - [ ] Especially scrutinize `login.tsx` and `reset-password.tsx` for cleanup.
    - Routes checklist:
      - [x] `/auth/session/refresh`
      - [x] `/form-test`
      - [x] `/`
      - [ ] `/login`
      - [x] `/logout`
      - [x] `/private`
      - [ ] `/reset-password`
