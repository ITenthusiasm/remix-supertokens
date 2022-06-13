# Remix Supertokens

Hello! This is my **_attempt_** at providing an example on how to use [`Remix`](https://remix.run/) with [`SuperTokens`](https://supertokens.com/). **This repository is not yet finished.** I have only recently (2022-06-13) made this repository public because now there's finally something that people can start working with.

## Frequently Asked Questions

### Why Use a Custom Solution Instead of the Components Provided by SuperTokens?

There are a few reasons why a custom solution was used in this repoistory (instead of what SuperTokens provides for the frontend). To give just a few...

1. **The current solutions that SuperTokens provides require JavaScript**.\* _This means that users who disable (or for some reason fail to properly receive) the JavaScript necessary for your webpage will be unable login_. Having a custom solution that doesn't require JavaScript for your application to work will improve user experience. Moreoever, it makes Remix easier to integrate with.
2. **The current solutions that SuperTokens provides don't follow good accessibility (a11y) guidelines (yet)**.\* A custom solution allows us to make our forms more accessible while we wait for improvements. Note that I am still making improvements on this repo, myself; so suggestions are welcome. Consult the [MDN docs](https://developer.mozilla.org/) for more a11y info. Some example concerns (non-exhaustive):
   - Many of their HTML `input`s lack proper `label`s and use `div`s instead.
   - The `Forgot password` "link" is a regular `div` (instead of an `a`) that requires JS to work. It is **not** focusable (which means keyboard users **cannot** use it).
   - Visual users have an indicator of when they are hovering over the `SIGN IN` button, but **not** when they are focusing the button (via keyboard).
   - No ARIA attributes are used to enhance the auth forms for better accessibility (e.g., [`aria-errormessage`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-errormessage)).
3. By writing out the code from scratch, this repository becomes _far_ more transferrable between frontend frameworks (especially frameworks that SuperTokens does not yet have example components for).
4. A custom solution is much easier to add custom styles to via CSS.
5. A custom solution gives you a better idea of what the SuperTokens components do for you (for those of you who are overly curious like me).

\* _Almost certainly, these concerns with the components provided by SuperTokens will be resolved in the future. (Part of the point of this repo is to give potential improvement ideas.) Recall that the project is still rather new. And surely **all** of us have had those days when we forgot anything and everything about semantic HTML and accessible web apps. I'm still learning, myself_.

### Why Aren't You Using `supertokens-website`

Depending too much on `supertokens-website` will result in an application that cannot run without JavaScript.\* If the app works fine without `supertokens-website`, why use it and increase the end user's bundle size? :)

\* _Although we want an application that **works** well without JavaScript, there is nothing wrong with **enhancing** our application with JavaScript. If I find that `supertokens-website` enables me to **enhance** my app in the future, then I will use it. You'll notice that I still have `supertokens-website` installed just in case that use case arises... though I may also remove it soon._

I hope you find this useful... Let me know your thoughts here on GitHub or on their [Discord](https://supertokens.com/discord). :) If there are any ways that I can improve anything here, feel free to say so.

Note: Until the SuperTokens team reviews this code itself and gives the okay that it works as expected/needed, know that I could be wrong on my approach here. :) (This comment will be updated after they see it.)

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
