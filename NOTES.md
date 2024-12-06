# Notes

The place where we keep our discoveries/findings as we try to develop this app. (If this gets too big, we may split this into smaller files.)

## Remix

### Authentication in Remix

Authentication in Remix seems to get a little complicated. Things are fine if you _only_ use JavaScript or _only_ disable JavaScript. But if you're working with someone who had JavaScript and disabled it later (or lost something later due to web connections), you'll run into weird scenarios because of how Remix handles data loading.

We learned from [@kiliman](https://github.com/kiliman) that you have to carefully set up your router to handle that use case. See his work on https://github.com/kiliman/express-auth-example/blob/main/server/index.js. Our `server.js` file now does something similar, though it's catered to `SuperTokens`. We may improve upon our own code structure in the future. `kiliman`'s comment from Discord:

> If request has search param `_data` then it's a Remix data request. Redirects should return status 204 with `x-remix-redirect` header. This is because Remix uses client-side fetch and a regular redirect would cause fetch to automatically redirect to new path, and Remix wants to control the redirect itself. Anyway, that's why the `unauthenticated` function works that way in my example.

Another interesting note from him on his approach:

> Yeah, my example only checks for the auth cookie. I still get the user in the loader as needed. This check in "Express" is simply so I have to opt-in for public routes (all routes are protected by default). I typically don't return data in `getLoadContext` as I want to use code from `/app` folder which isn't easy to do from `server.js`

You can see more about the brief conversation on the [Remix Discord](https://discord.com/invite/remix):

- https://discord.com/channels/770287896669978684/771068344320786452/979816724167819314
- https://discord.com/channels/770287896669978684/771068344320786452/979826223515582546

### Managing Form Errors in Remix

Managing form input errors in Remix is pretty great if you aren't using any progressively-enhancing JavaScript. Unfortunately, if you are using it because you need to handle client-side validation, things get a little complicated. (For this reason, consider whether or not your users **_really_** need client-side validation to enhance their experience. Facebook does not do this for its authentication forms. We have added it here just for the sake of example; but it is not necessarily practical here, and it can almost certainly be improved upon.)

First, you have to consider how often you want to perform validation. If you're performing validation `oninput` for every `input`, that could mean that your app will re-render a lot (depending on the structure of your `form`). Moreoever, if your validation relies on API calls, this would also mean that you're really applying an unnecessary load to your server. Debouncing could be a potential solution... but you can also change the event that you're listening for. For example, you could use `onchange` instead. However, this would mean that the user would have to "commit" their changes by "leaving" an input before they can know whether or not the error has been fixed. You'll have to weigh these pros and cons yourself. _Ideally, for this project, we would have preferred `onchange`_.

Second, you have to consider _how_ you're going to perform your validation at all. Will you build your own in-house solution, or will you rely on what already exists? Making your own solution takes time... How much time do you have? Is the effort to accomplish what you need practical/worthwhile? Relying on another's solution saves time. [`React Hook Form`](https://react-hook-form.com/) is an excellent tool for building out forms in React. In my opinion, it's superior to alternatives like `Formik` for several reasons. However, you'll have to be aware of the limitations of whichever option you choose. The `React` framework itself is limited by the fact that you cannot easily add **true** `onchange` handlers to `input`s; this implicitly limits every single form-related package that uses React.

We chose to go with `React Hook Form` to save time. Due to React's limitations, we had to run with `onblur`, as it's the closest thing we have to `onchange` -- just slightly more frequently called (depending on the user).

## SuperTokens

### Refreshing Access Tokens with Browser Navigation

According to [rishabhpoddar](https://github.com/rishabhpoddar) on [GitHub](https://github.com/ITenthusiasm/remix-supertokens/issues/1#issuecomment-1173096311):

> The page the user needs to be redirected to must have the same path as the refresh token API (that is provided by us). That path is `/{apiBasePath}/session/refresh` (`/auth/session/refresh` by default). The reason for this is that the refresh token cookie is restricted to be sent to only that exact path (for security reasons)

This restricts the name of our route to something less appealling, but it's not that big of a deal. Just be aware of this restriction if you change the API route you use for SuperTokens (which I would not recommend doing).

Note that this use case is only significant when a token has to be refreshed via browser navigation (e.g., to take care of users who have JS disabled). If you don't need to make session refreshing possible through browser navigation, then an `/auth/session/refresh` page route isn't even necessary. (You don't need browser navigation if you don't care about users who disable or cannot use JS. In that instance, you are guaranteed to have access to the JS `fetch` API on the frontend, and you can just rely on that or on `supertokens-website`.)

Note that this solution requires more careful attention to be given to JS users who are filling out complex forms and need to re-authenticate. However, the concerns here are no different than for JS users who occasionally refresh the page. The best/simplest solution here is `localStorage`, not necessarily `supertokens-website`.

## Testing

### Playwright

#### General Playwright Testing Guidelines

- When performing assertions on URLs, follow this convention:
  - Prefer `expect(page).toHaveURL()` when a test legitimately needs to assert that a page's URL looks correct.
  - Prefer `page.waitForURL()` when the page's URL is not of primary interest. (For example, after a logout, you may expect to be brought to the Login Page. However, your test might only be interested in performing assertions on the page's auth-related Cookies.)
  - Prefer `page.waitForURL()` when you want to perform a valid assertion on a page's URL, _but `expect(page).toHaveURL()` will not work_. (This may happen, for example, if you want to perform an assertion only on a page's `pathname`, but not it's `search` portion.)
  - **_ALWAYS AVOID SYNCHRONOUS ASSERTIONS ON PAGE URLS_**. These are flaky and unreliable (or they require awkward dancing in your tests to be made reliable). Don't do `expect(new URL(page.url()).pathname).toBe(somePath)`. Use the native approaches mentioned earlier instead.

#### Tests Misbehave When Buttons Move _While Being Clicked_

We discovered this phenomenon while trying to test our own forms -- which used error messages that shifted the submitter around.

Apparently, Playwright's ability to correctly order `click` and `focusout` events will be disrupted if Playwright tries to click a _moving_ target. For example, imagine that a form's textfield is currently in focus in a Playwright test. Then imagine that the form's layout _shifts_ when the test user tries to click the submit button, causing the submitter to move out of range of where the click _would have occurred_. (One way that this can happen is if the removal of a field's error message causes a form submitter to be shifted upwards. This is a _bad_ approach to removing error messages.) In this case, the `focusout` and `click` events will likely fire in an incorrect order in Playwright -- causing bugs/errors in tests. But this problem **_won't_** happen if the submit button stays in place the entire time.

This might be odd behavior in Playwright, but it technically forces developers to create better user experiences, which is a good thing. A button _should not_ move while a user is trying to click it.

#### Setting Cookies in Response to Form Submissions

When it comes to servers that set cookies in response to submitted forms, Playwright's overall behavior/experience with cookies for Remix apps seems to vary based on whether or not JS is enabled. (This is likely true for other emerging SSR frameworks as well. It might even be true for all applications in general. It's _at least_ true for SvelteKit as well.) If a&rpar; JS is disabled and b&rpar; a submitted form causes the server to update the user's cookies, then Playwright appears to set those cookies immediately. More accurately, you can perform `await page.click(submitter)` and then immediately check `await context.cookies()` safely to verify the cookie changes. This behavior might be because `<form>`s always cause a (_real_) page navigation to happen -- even if the user is only navigated to the page that they were already on. (This is relevant because it's possible that `await context.cookies()` has to wait for the new page to load first. And by that time, the cookies should already be set in the browser.)

However, the immediate verification of cookies **_does not_** seem to be safe when JS is _enabled_. That is, the immediate verification _does not_ seem to be safe when cookies are updated in response to a `fetch` request instead of a page navigation. In these cases, it seems that the Playwright test needs to _wait_ for the response to be processed _before_ `await context.cookies()` can be safely checked. Please keep this in mind while writing your tests.
