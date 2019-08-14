# swork-cache

[![Greenkeeper badge](https://badges.greenkeeper.io/justin-lee-collins/swork-cache.svg)](https://greenkeeper.io/)

swork-cache is caching middleware for Swork applications and is built with TypeScript and async methods.

### Example

```ts
import { Swork } from "swork";
import { Router } from "swork-router";
import { strategies } from "swork-cache";

const app = new Swork();
const router = new Router();

router.get("/api/foos", strategies.backgroundFetch());

app.use(router.routes());

app.listen();
```

## Installation

Install via npm:

```ts
npm install swork-cache
```

Install via yarn:

```ts
yarn add swork-cache
```

## Cache Strategies

### `backgroundFetch`

This strategy will immediately return a value from the cache if it exists. If a cache entry is found, a fetch for the latest version of the asset will occur in the background and update the cache. If a cache entry is not found, the request will respond with the fetch of the asset immediately after updating the cache.

### `cacheFirst`

This strategy will immediately return a value from the cache if it exists. If a cache entry is not found, the request will respond with the fetch of the asset immediately after updating the cache. Once an item is in the cache, there will be no subsequent requests to get the latest version.

### `networkFirst`

This strategy will attempt to fetch the asset from the source and will pass on the response if there is no error. In the case of an error, the strategy will attempt to find a match in the cache.

### `networkOnly`

This strategy only attempts to get the asset from the network source and does not utilize caching.

## Custom Cache Strategies

All of the pre-defined cache strategies implement the `CacheStrategy` type. To provide a custom caching strategy, just define a method matching the `CacheStrategy` signature.

```ts
/**
 * Defines a cache strategy delegate. 'key' defaults to service worker version.
 */
type CacheStrategy = (cacheKey?: string) => (context: FetchContext, next: () => Promise<void>) => Promise<void> | void;
```

The `cacheKey` parameter is intended to specify a specific cache and defaults to the service worker version found in `configuration.version` provided by `swork`.

## Cache Event Handlers

In addition to caching strategies, `swork-cache` provides event handlers to simplify management of cache entries.

### `preCache`

`preCache` is an event handler that will cache any provided urls during the install phase of the service worker.

```ts
import { events } from "swork-cache";

// ...
app.on("install", events.install.preCache([
    // array of urls to pre-cache
]);
```

### `clearCacheOnUpdate`

`clearCacheOnUpdate` is an event handler that will delete unnecessary cache entries during the activate phase of the service worker. Which cache entries to remove is determined by an overridable whitelist of keys that defaults to the `configuration.version` provided by `swork`.

```ts
import { events } from "swork-cache";

// ...
app.on("activate", events.activate.clearCacheOnUpdate());
// or
app.on("activate", events.activate.clearCacheOnUpdate({
    whitelist: ["api-data"],
    ignoreCase: true
}));
```
