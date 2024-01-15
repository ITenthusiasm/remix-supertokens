/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node" />

import "@remix-run/server-runtime";

declare module "@remix-run/server-runtime" {
  export interface AppLoadContext {
    user?: { id: string };
  }
}
