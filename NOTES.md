# Notes

The place where we keep our discoveries/findings as we try to develop this app. (If this gets too big, we may split this into smaller files.)

## Remix

### Authentication in Remix

Authentication in Remix seems to get a little complicated. Things are fine if you _only_ use JavaScript or _only_ disable JavaScript. But if you're working with someone who had JavaScript and disabled it later (or lost something later due to web connections), you'll run into weird scenarios because of how Remix handles data loading.

We learned from [@kiliman](https://github.com/kiliman) that you have to carefully set up your router to handle that use case. See his work on https://github.com/kiliman/express-auth-example/blob/main/server/index.js. Our `server.js` file now does something similar, though it's catered to `SuperTokens`. We may improve upon our own code structure in the future. `kiliman`'s comment from Discord:

> If request has search param `_data` then it's a Remix data request. Redirects should return status 204 with `x-remix-redirect` header. This is because Remix uses client-side fetch and a regular redirect would cause fetch to automatically redirect to new path, and Remix wants to control the redirect itself. Anyway, that's why the `unauthenticated` function works that way in my example.

Another interesting note from him on his approach:

> Yeah, my example only checks for the auth cookie. I still get the user in the loader as needed. This check in "Express" is simply so I have to opt-in for public routes (all routes are protected by default). I typically don't return data in `getLoadContext` as I want to use code from `/app` folder which isn't easy to do from `server.js`

You can see more about the brief conversation on Discord:

- https://discord.com/channels/564830074583515176/564830075350941707/979829795619733504
- https://discord.com/channels/564830074583515176/564830075350941707/979828827620507659
