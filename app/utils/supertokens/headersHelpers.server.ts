/** A `Map.forEach` helper that sets cookies to the provided `Headers`  */
export function setCookiesFromMap(headers: Headers) {
  return function setCookies(value: string): void {
    headers.append("Set-Cookie", value);
  };
}

/** A `Map.forEach` helper that sets headers for the provided `Headers` */
export function setHeadersFromMap(headers: Headers) {
  return function setHeaders(value: string | string[], name: string): void {
    if (typeof value === "string") headers.set(name, value);
    else value.forEach((v) => headers.append(name, v));
  };
}
