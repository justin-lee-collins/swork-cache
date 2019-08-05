import { configuration } from "swork";

/**
 * Defines the configuration options of the clearCacheOnUpdate handler
 *
 * @interface IClearCacheOnUpdateConfiguration
 */
interface IClearCacheOnUpdateConfiguration {
    /**
     * List of keys to not be removed.
     *
     * @type {string[]}
     * @memberof IClearCacheOnUpdateConfiguration
     */
    whitelist?: string[];

    /**
     * Flag to ignore case of keys. Defaults to false.
     *
     * @type {boolean}
     * @memberof IClearCacheOnUpdateConfiguration
     */
    ignoreCase?: boolean;
}

export const events = {
    activate: {
        /**
         * An activate event handler that will clear cache entries of pervious service worker implementations.
         *
         * @param {IClearCacheOnUpdateConfiguration} [config]
         * @returns
         */
        clearCacheOnUpdate: (config?: IClearCacheOnUpdateConfiguration) => {
            config = Object.assign({
                ignoreCase: false,
                whitelist: [configuration.version],
            }, config);

            return async () => {
                let keys = await caches.keys();
                let whitelist: string[] = config!.whitelist!;

                if (config!.ignoreCase) {
                    whitelist = config!.whitelist!.map((x) => x.toLowerCase());            
                    keys = keys.filter((x) => whitelist.indexOf(x.toLowerCase()) === -1);            
                } else {
                    keys = keys.filter((x) => whitelist.indexOf(x) === -1);            
                }

                await Promise.all(keys.map(async (key: string) => {
                    await caches.delete(key);

                    if (configuration.environment === "development") {
                        console.log(`clearCacheOnUpdate successfully removed cache with key "${key}"`);
                    }
                }));
            };
        },
    },
    install: {
        /**
         * An install event handler that will pre-cache all the provided paths.
         *
         * @param {string[]} urlsToCache
         * @param {string} [cacheKey]
         * @returns {() => Promise<void>}
         */
        preCache: (urlsToCache: string[], cacheKey?: string): () => Promise<void> => {
            cacheKey = cacheKey || configuration.version;

            return async () => {
                const cache = await caches.open(cacheKey!);

                await cache.addAll(urlsToCache);

                if (configuration.environment === "development") {
                    console.log(`preCache successfully completed (${urlsToCache})`);
                }
            };
        },
    },
};
