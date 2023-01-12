import type { HTTPMethod } from "supertokens-node/lib/build/types";

/*
 * NOTE: If you see odd instances where I'm defaulting `null` to `undefined`, it's because
 * `SuperTokens` _requires_ the usage of `undefined` instead of `null` -- as odd as that may
 * be.
 */

/** Object representing the minimum amount of data that `SuperTokens` requires to function. */
interface RequestData {
  /** A valid request body (_DO NOT_ use a `Buffer`) */
  body?: unknown;
  /** The _complete_ request URL */
  url?: string;
  /** The HTTP method of the request */
  method?: HTTPMethod;
  /** The headers belonging to the request */
  headers: Map<string, string>;
}

/**
 * Acts as an input to `SuperTokens`'s auth functions/methods, replacing the inflexible `req`
 * (request) object that it typically requires. Instead of taking the approach of dangeorusly
 * "`extend`"-ing the `req` object, it accepts any data that should be _communicated_ to
 * `SuperTokens` without altering or making presumptions about the original `req` object.
 *
 * You should pass an instance of this class to any `SuperTokens` function or methods that
 * expects a `req` (request) object.
 *
 * Extends the `BaseRequest` from `SuperTokens`.
 */
class SuperTokensDataInput {
  // SuperTokens Hijacks
  #wrapperUsed = true as const;

  // Custom Data
  #body?: RequestData["body"];
  #query?: URLSearchParams;
  #url?: RequestData["url"];
  #method?: RequestData["method"];
  #headers: RequestData["headers"];
  #cookies = new Map<string, string>();

  /**
   * Accepts any input data which `SuperTokens` requires to perform its functions, and transforms it into
   * an object that can _safely_ be used in `SuperTokens`'s functions/methods _without_ disturbing
   * the original request object.
   *
   * @param requestData Object representing the minimum amount of data that `SuperTokens` requires to function.
   */
  constructor({ body, url, method, headers }: RequestData) {
    const COOKIE_HEADER = "cookie";

    this.#body = body;
    if (url) this.#query = new URL(url).searchParams;
    this.#method = method;
    this.#url = url;

    this.#headers = new Map(headers);
    // Derive request cookies from the request headers
    const cookiePairs = this.#headers.get(COOKIE_HEADER)?.split("; ");

    if (cookiePairs?.length) {
      cookiePairs.forEach((pair) => {
        const [key, value] = pair.split("=");
        this.#cookies.set(key, value);
      });
    }
  }

  /** Internal getter used strictly for communicating with SuperTokens */
  get wrapperUsed(): true {
    return this.#wrapperUsed;
  }

  // TODO: Should we distinguish between form data and JSON data in another private property?
  /** Internal method used strictly for communicating with SuperTokens */
  getFormData(): unknown {
    return this.#body;
  }

  /** Internal method used strictly for communicating with SuperTokens */
  getJSONBody(): unknown {
    return this.#body;
  }

  /** Internal method used strictly for communicating with SuperTokens */
  getKeyValueFromQuery(key: string): string | undefined {
    return this.#query?.get(key) ?? undefined;
  }

  /** Internal method used strictly for communicating with SuperTokens */
  getOriginalURL(): string | undefined {
    return this.#url;
  }

  /** Internal method used strictly for communicating with SuperTokens */
  getMethod(): HTTPMethod | undefined {
    return this.#method;
  }

  /** Internal method used strictly for communicating with SuperTokens */
  getHeaderValue(key: string): string | undefined {
    const headerValue = this.#headers.get(key);
    if (headerValue == null) return undefined;

    // Accounts for headers with multiple values
    const [firstHeaderValue] = headerValue.split(", ");
    return firstHeaderValue;
  }

  /** Internal method used strictly for communicating with SuperTokens */
  getCookieValue(key: string): string | undefined {
    const cookieValue = this.#cookies.get(key);

    if (!cookieValue) return undefined;
    return decodeURIComponent(cookieValue);
  }
}

export default SuperTokensDataInput;
