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

You'll notice that across our application, we handle authentication in a way that fits the "Remix way" to enhance user experience (e.g., to allow people to login without needing JavaScript). This requires us to make API requests _from_ our server, _to_ our server (with the requests being sent to the SuperTokens API `route` we specify). This gimmick works fine, but there's a catch when it comes to session refreshing: **The Remix session refresh route must be the _exact same_ as the SuperTokens API refresh route**.

According to [rishabhpoddar](https://github.com/rishabhpoddar) on [GitHub](https://github.com/ITenthusiasm/remix-supertokens/issues/1#issuecomment-1173096311):

> The page the user needs to be redirected to must have the same path as the refresh token API (that is provided by us). That path is `/{apiBasePath}/session/refresh` (`/auth/session/refresh` by default). The reason for this is that the refresh token cookie is restricted to be sent to only that exact path (for security reasons)

This restricts the name of our route to something less appealling, but it's not that big of a deal. Just be aware of this restriction if you change the API route you use for SuperTokens (which I would not recommend doing).

Note that this use case is only significant when a token has to be refreshed via browser navigation (e.g., to take care of users who have JS disabled). If you don't need to make session refreshing possible through browser navigation, then an `/auth/session/refresh` page route isn't even necessary. (You don't need browser navigation if you don't care about users who disable or cannot use JS. In that instance, you are guaranteed to have access to the JS `fetch` API on the frontend, and you can just rely on that or on `supertokens-website`.)

Note that this solution requires more careful attention to be given to JS users who are filling out complex forms and need to re-authenticate. However, the concerns here are no different than for JS users who occasionally refresh the page. The best/simplest solution here is `localStorage`, not necessarily `supertokens-website`.

## React

### `useFormLocalStorage`

`useFormLocalStorage` is a _custom_ `React Hook` used to store form data in `localStorage`. (Note that `localStorage` should only be used for complex forms.) This hook relies on `actWithLocalStorage`. `actWithLocalStorage` is built on the concept of `React Action`s, which is introduced in [this Medium article](https://thomason-isaiah.medium.com/do-you-really-need-react-state-to-format-inputs-9d17f5f837fd). In `actWithLocalStorage`, we basically attach `change` handlers, which store form data in `localStorage`, to all of the target `form`'s input fields. **Note that `useFormLocalStorage` is a _minimalistic_ function that exists just for the sake of example**. It can certainly be improved upon.

Here's what you **can** do with our utility:

1. _Automatically store data_ for form fields in `localStorage` whenever their values `change` (as long as they each have a `name` attribute).
   - You can see an example of this on the [`form-test` page](./app/routes/form-test.tsx)
2. _Automatically load data_ from `localStorage` into form fields whenever the page refreshes (or is navigated to). (Again, this only works if each field has a `name` attribute.)
3. _Clear data_ from `localStorage` (**manually**).

And here are some **limitations** of our utility:

1. Our approach **requires** that all necessary form fields be given a `name` attribute.
   - This means that you cannot leverage nameless form fields. _However_, if you're using Remix, you're very likely `name`-ing all of your fields anyway. Moreover, this approach enforces a _consistent_ way to use `useFormLocalStorage`. Consistency is very beneficial. And sticking to one approach makes sense if you're working in a single codebase (as opposed to creating a flexible package to be used by anyone).
2. Our approach does not try to address colliding field `name`s.
   - Consider complex Form A with an input named `"my-input"`. Now consider another complex Form B with an input _also_ named `"my-input"`. Because the same key is being used in `localStorage`, forms A and B can impact and overwrite each other. You might consider modifying our Hook/Action to avoid this problem, but that requires more effort. We have foregone this effort under the assumption that such problems are unlikely to rise up as long as you minimize the amount of data you're putting in `localStorage`. (Nonetheless, to resolve this problem, you could create a mechanism that "scopes" a set of form information in `localStorage` to a specific form.)
3. Our approach does not warn developers if a field within the target `form` does not have a `name` attribute.
   - This is because exposing environment variables (by which we can know whether we're in `production` or `development` mode) is slightly more complex in Remix (though it is still easy), and we would _only_ want to log such warnings in `development`. We wanted to keep our function simple; in this scenario, that means foregoing warnings. Again, our utility can _certainly_ be enhnaced.
4. Our approach _requires_ using `localStorage` (unsurprisingly). If you want to use another storing mechanism, you will have to update our Hook/Action to do so.
   - For instance, you could update `useFormLocalStorage` to accept an optional `storage` argument that defaults to being `localStorage`. This `storage` argument would have an [`interface`](https://www.typescriptlang.org/docs/handbook/2/objects.html) that implements `setItem`, `getItem`, and `removeItem` (as well as any other methods you may need). With this approach, you could use _any_ technique for storing/clearing form information. However, this increases the complexity, so we have foregone this in our utility.
5. The need to clear `localStorage` manually is a bit of a downer. But this one is a set of tradeoffs. The developer should have the freedom to decide when storage gets cleared (whether it's because a certain amount of time transpired, or because the form was successfully submitted, or because of whatever else). The cost of this freedom is having to call the function manually.
   - Theoretically, you could enhance our utility by adding some kind of `"lifetime"` option. You could default this value to a certain amount of time (so that developers don't accidentally store things for all eternity) while still enabling developers to choose to store a value forever (in which case they're responsible for avoiding their own footshooting).
6. Our solution **does not** account for `form`s that have dynamically changing fields. (i.e., If you add or remove a form field _after_ your `form` element has already mounted.)
   - You could get around this problem by leveraging a [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) that watches the target `form` for any added or removed fields. However, this increases complexity. And you'd have to be wise about when you add/remove Event Listeners and when you load/clear `localStorage` data in response to a DOM Node insertion/removal. This should be fairly straightforward... but again, we're aiming to keep things simpler in our example.
   - Another option would be to take the approach of [`React Hook Form`](https://react-hook-form.com/), which attaches React `ref`s to the form fields instead of the containing `form` element. However, there are tradeoffs that you will encounter with this technique. You'll have to pick your poison wisely.
