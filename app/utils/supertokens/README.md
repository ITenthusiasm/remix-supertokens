# Custom `SuperTokens` Utilities

This folder contains utility functions and classes that make it _significantly_ easier to work with `SuperTokens` in a _flexible_, _more robust_ way. In fact, this approach is so flexible that it _should_ enable you to get `SuperTokens` working with other options like [`SvelteKit`](https://kit.svelte.dev/) and [`SolidStart`](https://start.solidjs.com/). (I will look into a POC later.) If your server requires HTTPS, then the approach used here (or something similar) is more or less required for Remix to work "cleanly". (There are exceptions to that, but these exceptions will make your app slower and less secure.)

The approach laid out here attempts to make `SuperTokens` more flexible by only requiring request `Headers` as inputs (and occasionally the request method) and only returning response `Headers` as outputs (together with some extra data that the developer can utilize if desired). This gives the end developer _vastly_ greater options to choose from (especially in `SvelteKit` and `SolidStart`). My hope is that the SuperTokens team will update their `supertokens-node` codebase to do exactly this. (That is, my hope is that the team will update their tools to _only_ require request `Headers` as inputs and to _only_ return response `Headers` + any useful data as outputs.) Such a refactor would enable `SuperTokens` to support a much broader range of frontend frameworks while also enabling the team to simplify and consolidate their codebase and their docs.

## How It Works

The approach is simple: Whenever a `SuperTokens` function (e.g., `Session.getSession`) would require you to pass a `request` object, **replace** the request object with an instance of `SuperTokensData.Input`. You can pass any data that the function needs into the constructor of `SuperTokensData.Input`. (Usually this will only be the reqest `Headers`. Occasionally, you might need the request `method` due to a limitation of the internals of `supertokens-node`.)

Similarly, whenever a `SuperTokens` function (e.g., `Session.getSession`) would require you to pass a `response` object, **replace** the response object with an instance of `SuperTokensData.Output`. When you're done calling all of the necessary `SuperTokens` functions, the `responseHeaders` property of `SuperTokensData.Output` will be correctly updated with everything needed to make sure that the auth in your app behaves correctly. Just be sure to include these response headers in the final response that you send back to the client.

There are additional utility functions here to simplify the efforts surrounding signing in, signing up, resetting passwords, etc. You can use these in your `Remix` actions as needed. Alternatively, you can forego the helper functions and place any necessary logic _directly_ in your `Remix` actions.

## "I Don't Want to Have to Write Code..."

Although this approach requires slightly more effort (i.e., you can't rely on the more concise `app.use(middleware())` and `app.use(errorHandler())` to get `SuperTokens` working anymore), it gives you greater clarity into _what_ your app is doing; and it gives you greater _control_ to make sure your app is doing exactly what you want. More importantly, you will have to do this anyway if you aren't using something like a Node adapter. Same goes for other frameworks.

## Disclaimer

**WARNING**: This implementation relies on knowledge of SuperTokens internals. Although it is unlikely that SuperTokens would alter the `supertokens-node` codebase in such a way that this code would break, the danger is still there. This is **only** intended to be a **temporary** solution until the `SuperTokens` team supports something like this approach _natively_ in `supertokens-node`. Nonetheless, it's the best that we've got right now for `Remix`...
