# TODO

- [ ] Add `useFormLocalStorage` hook to `React Discoveries` with valid tests.
- [ ] Remove redundant imports of `global.scss`. (Anything in `root.tsx` will always be global.)
- [ ] Create separate `Header` component to simplify how `root.tsx` looks.
- [ ] Improve `README.md` for developers trying to use this as an example.
  - Maybe add more documentation too?
- [ ] Progressively _enhance_ webapp with JavaScript.
  - [x] The application works just fine with or without JavaScript. But we should enhance it so that when JS users alter the auth form inputs (after receiving an error message), the appropriate error message is dismissed. Consider `react-hook-form`.
  - [x] Improve session refreshing User Experience (UX) for JS users by storing complex form data in `localStorage` (only when necessary). That way, if a session refresh happens (which requires browser navigation), the user will not lose their form data.
    - This approach keeps things simple because: 1) We can stick to one method for refreshing sessions (i.e., browser navigation) and 2) We can decrease our bundle size.
- [ ] Add an example of how to get everything up an running with a PostgreSQL database.
- [ ] Cleanup code and make it less trash. (ongoing)
  - [ ] Should we handle non-200 error responses from SuperTokens?
  - [ ] Especially scrutinize `login.tsx` and `reset-password.tsx` for cleanup.
