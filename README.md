# Remix Supertokens

Hello! This is my attempt at providing an example on how to use [`Remix`](https://remix.run/) with [`SuperTokens`](https://supertokens.com/). This repo is more or less "working". There are a few coding pieces I have to fix up, though, (like updating the server code in production mode). I have only recently (2022-06-13) made this repository public because now there's finally something that people can start working with.

## How to Run the App

1. Start the SCSS-to-CSS compiler by running `npm run sass`
2. Start the dev server by running `npm run dev`.
   - **Remember to add your own `.env` file to configure SuperTokens!** You will need to configure:
     - `DOMAIN`
     - `SUPERTOKENS_CONNECTION_URI`
     - `SUPERTOKENS_API_KEY`
     - `SUPERTOKENS_WEBSITE_DOMAIN`
     - `SUPERTOKENS_API_DOMAIN`
     - `SUPERTOKENS_API_BASE_PATH`

## Frequently Asked Questions

### Why Use a Custom Solution Instead of the Components Provided by SuperTokens?

There are a few reasons why a custom solution was used in this repository (instead of what SuperTokens provides for the frontend). To give just a few...

1. **The current solutions that SuperTokens provides require JavaScript**.\* _This means that users who disable_ (or for some reason fail to properly receive) _the JavaScript necessary for your webpage will be unable login_. Having a custom solution that doesn't require JavaScript for your application to work will improve user experience. Moreoever, it makes Remix easier to integrate with.
2. **The current solutions that SuperTokens provides is not very [accessible](https://developer.mozilla.org/en-US/docs/Web/Accessibility) (yet)**.\* A custom solution allows us to make our forms more accessible while we wait for improvements. Note that I am still making improvements on this repo, myself; so suggestions are welcome. Consult the [MDN docs](https://developer.mozilla.org/) for more a11y info. Some example concerns can be found in [SUPERTOKENS_SUGGESTIONS](./SUPERTOKENS_SUGGESTIONS.md).
3. **By writing out the code from scratch, this repository becomes _far_ more transferrable between frontend frameworks** (especially frameworks that SuperTokens does not yet have example components for).
4. **A custom solution is easier to add custom styles to via CSS.**
5. **A custom solution gives you a better idea of what the components provided by SuperTokens do for you** (for those of you who are overly curious like me).

\* _Almost certainly, these concerns with the components provided by SuperTokens will be resolved in the future. (Part of the point of this repo is to give potential improvement ideas.)_

### Why Aren't You Using `supertokens-website`?

Depending too much on `supertokens-website` will result in an application that cannot run without JavaScript.\* This, in turn, means that our application won't be as accessible. By excluding `supertokens-website`, we can circumvent this problem. Moreover, if we remove `supertokens-website` from our dependencies, then our end users will receive a smaller bundle size.

\* _Although we want an application that **works** well without JavaScript, there is nothing wrong with **enhancing** our application with JavaScript. It just so happens that we can do this fairly well without relying on `supertokens-website` in Remix land._

I hope you find this useful! Let me know your thoughts here on GitHub or on their [Discord](https://supertokens.com/discord). :) If there are any ways that I can improve anything here, feel free to say so.

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
