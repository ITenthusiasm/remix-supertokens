# Remix Supertokens

Hello! This is my attempt at providing an example on how to use [`Remix`](https://remix.run/) (an amazing tool for building SSR web applications in React) with [`SuperTokens`](https://supertokens.com/) (an open source alternative to user authentication). Note that this repository uses the `EmailPassword` recipe/approach from `SuperTokens` for its examples. However, the code here should be easily transferrable to the other authentication repices/methods that `SuperTokens` provides.

Note that this application takes an SSR-only approach for three reasons: 1&rpar; Better security (big plus), 2&rpar; Guaranteed [progressive enhancement](https://remix.run/docs/en/main/pages/philosophy#progressive-enhancement) (also a big plus), and 3&rpar; Easier code management (arguably).

If there are any questions, concerns, or ideas for improvement, feel free to reach out to me in the [SuperTokens Discord](https://supertokens.com/discord) or the [Remix Discord](https://rmx.as/discord). (Technically either one works. But if your question is more oriented towards SuperTokens, you should probably ping me on the SuperTokens Discord.)

## How to Run the App

1. Start the SCSS-to-CSS compiler by running `npm run sass`.
   - This is necessary because `Remix` only reads `CSS` files, not `SCSS` files; so `Remix` needs compiled CSS files that it can reference.
2. Start the dev server by running `npm run dev`.
   - **Remember to add your own `.env` file to configure SuperTokens!** You will need to configure:
     - `DOMAIN` (e.g., `http://localhost:3000`)
     - `SUPERTOKENS_CONNECTION_URI` (e.g., `https://try.supertokens.com`)
     - `SUPERTOKENS_API_KEY` (optional if your `SUPERTOKENS_CONNECTION_URI` is `https://try.supertokens.com`)
     - `SUPERTOKENS_WEBSITE_DOMAIN` (e.g., `http://localhost:3000`)
     - `SUPERTOKENS_API_DOMAIN` (e.g., `http://localhost:3000`)
     - `SUPERTOKENS_API_BASE_PATH` (e.g., `/auth`)

## Gotchas

### Properly Using ESM

This project uses ESM by default. (This was accomplished by setting `type` to `"module"` in the `package.json` file.) Unfortunately, this creates some complications. In short, all `import`s that will be handled by Node.js -- whether in transpiled files or in untranspiled files -- _need_ to follow the [rules](https://nodejs.org/api/esm.html#import-specifiers) that Node.js provides for ESM imports. Some examples:

- The `/server.js` file is pure JS. It is not transpiled, and it is run directly by Node. Therefore, it must properly include the `.js` file extension for relative imports.
- Node.js will _eventually_ encounter `index.server.ts` (_post transpilation_). Node.js cannot understand `import Session from "supertokens-node/recipe/session"` when using ESM, and Remix does not transpile this import since it comes from `node_modules`. Therefore, you must change it to `import Session from "supertokens-node/recipe/session/index.js"` for Node's sake.

We've already taken care of this for you in our project. However, you should keep this in mind when _extending_ this project with your own code.

(Some additional context: https://discord.com/channels/770287896669978684/1194003027695247391/1194003027695247391)

### Remix's File Routing System

There seems to have been some [controversy](https://github.com/remix-run/remix/discussions/4482) surrounding the new file routing convention in Remix v2. Due to its (subjectively) unappealing look to the maintainers, we are [using the old file routing convention](https://remix.run/docs/en/main/start/v2#file-system-route-convention). However, you are more than welcome to use Remix's new system by removing the customization! Because this project doesn't use any directories for file routing, you will not experience any significant differences between either routing convention (assuming you haven't extended the project yet).

For what it's worth, the well-known web developer, [Kent C. Dodds](https://twitter.com/kentcdodds), has chosen to go with a [convention crafted by Kiliman](https://github.com/remix-run/remix/discussions/4482#discussioncomment-4723477). It seems favorable, and this project may very well incorporate it in the future.

## Frequently Asked Questions

### Why Use a Custom UI Instead of the Components Provided by SuperTokens?

There are a few reasons why a custom UI was used in this repository (instead of what SuperTokens provides for the React). To give just a few...

1. **The current solutions that SuperTokens provides require JavaScript**. [^1] _This means that users who disable_ (or for some reason fail to properly download) _the JavaScript necessary for your webpage will be unable login_. Having a custom solution that doesn't require JavaScript for your application to work will improve user experience. Moreoever, it makes Remix easier to integrate with.
2. **The current solutions that SuperTokens provides is not very [accessible](https://developer.mozilla.org/en-US/docs/Web/Accessibility) (yet)**. A custom solution allows us to make our forms more accessible while we wait for improvements. Note that I am still making improvements on this repo, myself; so suggestions are welcome. Consult the [MDN docs](https://developer.mozilla.org/) for more a11y info. Some example concerns can be found in [SUPERTOKENS_SUGGESTIONS](./SUPERTOKENS_SUGGESTIONS.md).
3. **By writing out the code from scratch, this repository becomes _far_ more transferrable between frontend frameworks** (especially frameworks that SuperTokens does not yet have example components for).
4. **A custom solution is easier to add custom styles to via CSS.**
5. **A custom solution gives you a better idea of what the components provided by SuperTokens do for you** (for those of you who are overly curious like me).

[^1] Almost certainly, these concerns with the components provided by SuperTokens will be resolved in the future. (Part of the point of this repo is to give potential improvement ideas.)

### Why Aren't You Using `supertokens-website` or `supertokens-web-js`?

Depending too much on `supertokens-website` or `supertokens-web-js` will result in an application that cannot run without JavaScript. And an application that can't run without JavaScript is actually [inaccessible to a lot of users](https://www.kryogenix.org/code/browser/everyonehasjs.html). Consequently, we've pursued a solution that works _without_ these pacakages and _without_ JavaScript. (Don't worry! We still _enhance_ the app with JS to improve the user's experience whenever possible.) This means that our application will be accessible to the broadest range of users! :smile:

As an added bonus, we decrease our JS bundle size when we avoid the use of `supertokens-website` and _especially_ `supertokens-web-js`.

### Why Aren't You Using the Middleware from `supertokens-node`?

If you've seen the comments from [@Rich-Harris](https://github.com/Rich-Harris) (creator of Svelte) regarding server middleware (e.g., Express Middleware), then you'll know that solutions which require you to use middleware are often restricted and will prevent you from enhancing your application with other very important features. This is especially true if you're working with an SSR framework. Unfortunately, I have found Rich Harris's statements to be correct while working with my own Svelte Kit application. There are workarounds for these problem cases that allow people to still use middleware... but those aggressive workarounds often end up looking more ugly and complicated. (And thus, such approachs are more prone to error).

Avoiding the `supertokens-node` middleware ended up being _required_ for me to use HTTPS in my application _and_ get it working with high security in Cloudflare. I'll spare you the details, but there are other edge cases like these where `supertokens-node` middleware just won't work (or won't work well). Thankfully, in `supertokens-node@14`, the SuperTokens team was kind enough to introduce functions that allow you to get authentication working _without_ using their custom middleware. If you're using any kind of SSR framework that leverages progressive enhancement ([SvelteKit](https://kit.svelte.dev/), [Remix](https://remix.run/), [SolidStart](https://start.solidjs.com/), etc.), then you'll want to leverage these functions instead of using the middleware as well.

## Security Insights

Although the middleware-free approach gives us many advantages when it comes to using SuperTokens with SSR frameworks, it also gives us a little more responsibility. You'll notice in this app that we have to be intentional about the settings which we use for our HTTP cookies. You don't necessarily need to use the settings that I have (though you _should_ use `HttpOnly` and you _should_ set a strict `Path`), but you should certainly ensure that your settings are the safest that they can be for your application. Here are some resources that may be helpful for you on the matter:

- [How the `Set-Cookie` HTTP Header Works](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [Docs for the `cookie` NPM package](https://www.npmjs.com/package/cookie) (Svelte Kit uses this under the hood to set the options for its cookies)

It doesn't currently seem like `Remix` provides any significant CSRF protection out of the box; so if you're interested in addressing the matter _and_ you're willing to stay with `Remix` (instead of trying out something else like `SvelteKit`), consider the following resources:

- [Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

SuperTokens does have some anti-CSRF features, but there are cases where it should be used and cases where it need not be used. From [@rishabhpoddar](https://github.com/rishabhpoddar):

> Basically, when you call `createNewSessionWithoutRequestResponse`, and if you get an anti csrf token, then you should pass that in when using `getSessionWithoutRequestResponse`. If you do not get an anti csrf token, you don't need it (based on your `apiDomain` and `websiteDomain` setting) and should check for custom request header before calling `getSessionWithoutRequestResponse`. You should not explicitly set the value of `disableAntiCsrf` when calling createNewSession unless you are not using cookies at all.

Bear in mind that if you're using a framework that (sufficiently) protects against CSRF by default, then you don't necessarily need to worry about the custom headers yourself.

---

I hope you find this useful! Let me know your thoughts here on GitHub or on their [Discord](https://supertokens.com/discord). :&rpar; If there are any ways that I can improve anything here, feel free to say so.

**(Original `Remix` README is below.)**

---

# Welcome to Remix!

- [Remix Docs](https://remix.run/docs)

## Development

Start the Remix development asset server and the Express server by running:

```sh
npm run dev
```

This starts your app in development mode, which will purge the server require cache when Remix rebuilds assets so you don't need a process manager restarting the express server.

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying express applications you should be right at home just make sure to deploy the output of `remix build`

- `server/build/`
- `public/build/`

### Using a Template

When you ran `npx create-remix@latest` there were a few choices for hosting. You can run that again to create a new project, then copy over your `app/` folder to the new project that's pre-configured for your target server.

```sh
cd ..
# create a new project, and pick a pre-configured host
npx create-remix@latest
cd my-new-remix-app
# remove the new project's app (not the old one!)
rm -rf app
# copy your app over
cp -R ../my-old-remix-app/app app
```
