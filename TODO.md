# TODO

- [ ] Progressively _enhance_ webapp with JavaScript.
  - [x] The application works just fine with or without JavaScript. But we should enhance it so that when JS users alter the auth form inputs (after receiving an error message), the appropriate error message is dismissed. Consider `react-hook-form`.
  - [ ] Should we consider including `supertokens-website`?
  - [ ] How to _isomorphically_ handle session refreshing? (We already handle session refreshing for non-JS users... which technically means we have everyone covered. But the UX would be better for JS users if we use `supertokens-website` to enhance `fetch` for better handling of session refreshing _if JS is available_... assuming this is possible. How to do this? Is it possible?)
    - Why this matters: _For JS users_ session refreshing via browser navigation complicates things if someone's session expires while, for example, filling out a large or complex form. (This is because they would lose all their data during browser navigation... unless we stored their data in `localStorage` or something. Obviously this problem doesn't matter so much for non-JS users, as they would have to bite the bullet anyway.) Trying to work with `localStorage` instead of `supertokens-website` might be a fair option as well.
- [ ] Add an example of how to get everything up an running with a PostgreSQL database.
- [ ] Cleanup code and make it less trash. (ongoing)
  - Should we handle non-200 error responses from SuperTokens?
