// @ts-ignore
import * as Response from "service-worker-mock/models/Response";
import { configuration, FetchContext } from "swork";
import { events } from "../src/events";
import { getFetchEvent, mockInit } from "./mock-helper";

declare var global: any;

describe("cache tests", () => {
    let context: FetchContext;

    let matchMock: (request: RequestInfo, options?: CacheQueryOptions) => Promise<Response | undefined>;
    let putMock: (request: RequestInfo, response: Response) => Promise<void>;

    let cacheMock: jest.Mock<Cache>;

    let openMock: jest.Mock<(cacheName: string) => Promise<Cache>>;
    let addAllMock: jest.Mock<(requests: RequestInfo[]) => Promise<void>>;
    let keysMock: jest.Mock<() => Promise<string[]>>;
    let deleteMock: jest.Mock<(cacheName: string) => Promise<boolean>>;

    let caches: CacheStorage;

    let cacheKeys: string[] = [];

    let fetchResponse: Response;
    let matchResponse: Response;

    let fetch: (request: RequestInfo) => Promise<Response>;

    const notFoundResponse = new Response("", {
        status: 404,
        statusText: "not found",
    });

    const validResponse = new Response("", {
        status: 200,
        statusText: "ok",
    });

    beforeEach(() => {
        mockInit();
        context = new FetchContext(getFetchEvent("http://www.google.com"));

        matchResponse = fetchResponse = validResponse;

        matchMock = jest.fn(() => matchResponse);
        putMock = jest.fn();
        addAllMock = jest.fn(() => Promise.resolve()) as unknown as jest.Mock<(requests: RequestInfo[]) => Promise<void>>;

        cacheMock = {
            addAll: addAllMock,
            match: matchMock,
            put: putMock,
        } as unknown as jest.Mock<Cache>;

        deleteMock = jest.fn(() => Promise.resolve(true)) as unknown as jest.Mock<(cacheName: string) => Promise<boolean>>;
        openMock = jest.fn(() => Promise.resolve(cacheMock)) as unknown as jest.Mock<(cacheName: string) => Promise<Cache>>;
        keysMock = jest.fn(() => Promise.resolve(cacheKeys)) as unknown as jest.Mock<() => Promise<string[]>>;
        
        caches = {
            delete: deleteMock,
            keys: keysMock,
            open: openMock,
        } as unknown as CacheStorage;

        fetch = jest.fn((request: RequestInfo): Promise<Response> => {
            const response = fetchResponse;
            response.url = typeof (request) === "string" ? request : request.url;
            return Promise.resolve(response);
        });

        Object.assign(global, {
            caches,
            fetch,
        });
    });

    test("preCache keys", async (done) => {
        let preCache = events.install.preCache([]);
        await preCache();

        expect(caches.open).toBeCalledWith("1.0.0");

        openMock.mockClear();

        preCache = events.install.preCache([], "A specified key");
        await preCache();

        expect(caches.open).toBeCalledWith("A specified key");

        done();
    });

    test("preCache adds all", async (done) => {
        const urlsToCache = ["/urlToCache"];

        const preCache = events.install.preCache(urlsToCache);
        await preCache();

        expect((cacheMock as unknown as Cache).addAll).toBeCalledWith(urlsToCache);

        done();
    });

    test("preCache debug logs", async (done) => {     
        configuration.environment = "production";
        
        let preCache = events.install.preCache([]);
        const logMock = console.log = jest.fn();
        await preCache();

        expect(logMock).toBeCalledTimes(0);

        configuration.environment = "development";

        preCache = await events.install.preCache([]);
        await preCache();

        expect(logMock).toBeCalledTimes(1);

        configuration.environment = "production";

        done();
    });

    test("clearCacheOnUpdate default whitelist", async (done) => {
        cacheKeys = ["1.0.1", "1.0.0"];

        const cacheClearOnUpdate = events.activate.clearCacheOnUpdate();        
        await cacheClearOnUpdate();

        expect(caches.delete).toBeCalledTimes(1);
        expect(caches.delete).toBeCalledWith("1.0.1");

        done();
    });

    test("clearCacheOnUpdate ignore case", async (done) => {
        cacheKeys = ["abcd", "ABC", "ABCD"];

        const cacheClearOnUpdate = events.activate.clearCacheOnUpdate({
            ignoreCase: true,
            whitelist: ["ABCD"],
        });        
        await cacheClearOnUpdate();

        expect(caches.delete).toBeCalledTimes(1);
        expect(caches.delete).toBeCalledWith("ABC");

        done();
    });

    test("clearCacheOnUpdate provided whitelist", async (done) => {
        cacheKeys = ["abcd", "abc", "ABCD"];

        const cacheClearOnUpdate = events.activate.clearCacheOnUpdate({
            whitelist: ["abcd"],
        });        
        await cacheClearOnUpdate();

        expect(caches.delete).toBeCalledTimes(2);
        expect(caches.delete).toBeCalledWith("abc");
        expect(caches.delete).toBeCalledWith("ABCD");

        done();
    });

    test("clearCacheOnUpdate debug logs", async (done) => {   
        configuration.environment = "production";

        cacheKeys = ["1.0.1", "1.0.0"];

        const cacheClearOnUpdate = events.activate.clearCacheOnUpdate({
            whitelist: ["1.0.1"],
        });        
        const logMock = console.log = jest.fn();
        await cacheClearOnUpdate();

        configuration.environment = "development";

        await cacheClearOnUpdate();

        expect(logMock).toBeCalledTimes(1);

        configuration.environment = "production";

        done();
    });
});
