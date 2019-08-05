import { FetchContext, Middleware } from "swork";
import { configuration } from "swork";

export type CacheStrategy = (cacheKey?: string) => Middleware;

export const strategies = {
    /**
     * Caching strategy that provides the current value in cache while updating 
     * in the background.
     *
     * @param {string} [cacheKey]
     * @returns
     */
    backgroundFetch: (cacheKey?: string) => {
        cacheKey = cacheKey || configuration.version;

        return async (context: FetchContext) => {
            const cache = await caches.open(cacheKey!);
            const response = await cache.match(context.request);

            const fetchPromise = fetch(context.request).then(async (fetchResponse) => {
                if (fetchResponse.ok) {
                    await cache.put(context.request, fetchResponse.clone());
                }

                return fetchResponse;
            });

            context.response = response || fetchPromise;
        };
    },
    /**
     * Caching strategy that always provides the current value in cache only going to 
     * network on a cache miss.
     *
     * @param {string} [cacheKey]
     * @returns
     */
    cacheFirst: (cacheKey?: string) => {
        cacheKey = cacheKey || configuration.version;

        return async (context: FetchContext) => {
            const cache = await caches.open(cacheKey!);
            let response = await cache.match(context.request);
            if (!response) {
                response = await fetch(context.request);
                if (response.ok) {
                    await cache.put(context.request, response.clone());
                }
            }

            context.response = response;
        };
    },
    /**
     * Caching strategy that always provides the value in cache. This strategy 
     * never accesses the network.
     *
     * @param {string} [cacheKey]
     * @returns
     */
    cacheOnly: (cacheKey?: string) => {
        cacheKey = cacheKey || configuration.version;

        return async (context: FetchContext) => {
            const cache = await caches.open(cacheKey!);
            context.response = cache.match(context.request) as Promise<Response>;
        };
    },
    /**
     * Caching strategy that provides the network response first only accessing the
     * cache when the network request fails.
     *
     * @param {string} [cacheKey]
     * @returns
     */
    networkFirst: (cacheKey?: string) => {
        cacheKey = cacheKey || configuration.version;

        return async (context: FetchContext) => {
            let response = await fetch(context.request);

            if (!response.ok) {
                const cache = await caches.open(cacheKey!);
                response = await cache.match(context.request) as Response;
            } else {
                const clone = response.clone();
                caches.open(cacheKey!).then((cache) => {
                    cache.put(context.request, clone);
                });
            }

            context.response = response;
        };
    },
    /**
     * Caching strategy that only accesses the network. This strategy never
     * accesses the local cache.
     * 
     * @returns
     */
    networkOnly: () => {
        return (context: FetchContext) => {
            context.response = fetch(context.request);
        };
    },
};
