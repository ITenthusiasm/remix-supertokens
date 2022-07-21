# SuperTokens Suggestions

This file holds a few of my suggestions for the SuperTokens team. These suggestions primarily revolve around the frontend, which I am more familiar with.

## Suggestions for the Provided Login Component

1. Provide proper `label`s for all of the HTML `input`s instead of using `div`s.
   - This will clarify the purpose of each input to people who need more accessibility (a11y) help.
2. Change the `Sign In`/`Sign Up` "link-like text" to be a regular link (an `a` tag).
   - This will ensure that people who aren't using JavaScript can easily access both the `Sign In` page and the `Sign Up` page. It also guarantees keyboard accessibility for the element.
3. Change the `Forgot Password` button from a `div` to a normal link (an `a` tag).
   - This will ensure that people who aren't using JavaScript can still access the page for resetting passwords easily. It will also ensure that users who rely on keyboards (instead of a mouse) can access this page.
4. Add `:focus` styles for all `button`s. You can probably copy whatever the `:hover` styles are for this.
   - This is something that will help _visual_ users who are relying on their _keyboard_. Currently, there is no visual indicator that the `button`s are being focused when navigating with a keyboard.
5. Add proper ARIA attributes to the auth forms for better a11y. (For instance, use [`aria-errormessage`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-errormessage) for any error messages related to inputs.)

Note: Even if the solutions that SuperTokens currently provides are dependent on JavaScript, it will still be useful to minimize the amount of JavaScript necessary on the frontend as much as possible. That way, when/if a JavaScript-free solution is crafted, it will be _much_ easier to perform the necessary migration.

## Suggestions for SuperTokens Endpoints

If possible, it would be great for the SuperTokens endpoints to support regular HTML `form` POSTS. This would guarantee that applications could work easily without JavaScript, and it would pave the way for some of the JS-free suggestions I mentioned previously. (The suggestions I gave still have value regardless because of a11y.)
