// @ts-ignore 
import * as Response from "service-worker-mock/models/Response";
import { FetchContext } from "swork";
import { RequestDelegate } from "swork/dist/swork";
import { strategies } from "../src/strategies";
import { getFetchEvent, mockInit } from "./mock-helper";

declare var global: any;

describe("cache tests", () => {
    let context: FetchContext;

    let matchMock: (request: RequestInfo, options?: CacheQueryOptions) => Promise<Response | undefined>;
    let putMock: (request: RequestInfo, response: Response) => Promise<void>;

    let cacheMock: jest.Mock<Cache>;

    let openMock: jest.Mock<(cacheName: string) => Promise<Cache>>;

    let caches: CacheStorage;

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

        cacheMock = {
            match: matchMock,
            put: putMock,
        } as unknown as jest.Mock<Cache>;

        openMock = jest.fn(() => Promise.resolve(cacheMock)) as unknown as jest.Mock<(cacheName: string) => Promise<Cache>>;

        caches = {
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

    async function keyTest(strategyFactory: (cacheKey?: string) => RequestDelegate) {
        let strategy = strategyFactory();
        await strategy(context);
        expect(caches.open).toBeCalledWith("1.0.0");

        openMock.mockClear();

        strategy = strategyFactory("A provided key");
        await strategy(context);
        expect(caches.open).toBeCalledWith("A provided key");
    }

    test("backgroundFetch keys", async (done) => {
        await keyTest(strategies.backgroundFetch);

        done();
    });

    test("cacheFirst keys", async (done) => {
        await keyTest(strategies.cacheFirst);

        done();
    });

    test("cacheOnly keys", async (done) => {
        await keyTest(strategies.cacheOnly);

        done();
    });

    test("networkFirst keys", async (done) => {
        fetchResponse = notFoundResponse;

        await keyTest(strategies.networkFirst);

        done();
    });

    test("backgroundFetch nothing cached with successful fetch", async (done) => {
        const strategy = strategies.backgroundFetch();

        matchResponse = null;

        await strategy(context);

        expect(context.response instanceof Promise).toBeTruthy();

        await context.response;

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(1);
        expect(putMock).toBeCalledTimes(1);
        expect(fetch).toBeCalledTimes(1);

        done();
    });

    test("backgroundFetch nothing cached with failed fetch", async (done) => {
        const strategy = strategies.backgroundFetch();

        matchResponse = null;

        fetchResponse = notFoundResponse;

        await strategy(context);

        expect(context.response instanceof Promise).toBeTruthy();

        await context.response;

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(1);
        expect(putMock).toBeCalledTimes(0);
        expect(fetch).toBeCalledTimes(1);

        done();
    });

    test("backgroundFetch something cached", async (done) => {
        const strategy = strategies.backgroundFetch();

        await strategy(context);

        expect(context.response instanceof Response).toBeTruthy();

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(1);

        done();
    });

    test("cacheFirst nothing cached with successful fetch", async (done) => {
        const strategy = strategies.cacheFirst();

        matchResponse = null;

        await strategy(context);

        expect(context.response instanceof Response).toBeTruthy();

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(1);
        expect(putMock).toBeCalledTimes(1);
        expect(fetch).toBeCalledTimes(1);

        done();
    });

    test("cacheFirst nothing cached with failed fetch", async (done) => {
        const strategy = strategies.cacheFirst();

        matchResponse = null;
        fetchResponse = notFoundResponse;

        await strategy(context);

        expect(context.response instanceof Response).toBeTruthy();

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(1);
        expect(putMock).toBeCalledTimes(0);
        expect(fetch).toBeCalledTimes(1);

        done();
    });

    test("cacheFirst something cached", async (done) => {
        const strategy = strategies.cacheFirst();

        await strategy(context);

        expect(context.response instanceof Response).toBeTruthy();

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(1);
        expect(fetch).toBeCalledTimes(0);

        done();
    });

    test("cacheOnly on failed match", async (done) => {
        const strategy = strategies.cacheOnly();

        matchResponse = null;

        await strategy(context);

        expect(context.response).toBe(null);

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(1);
        expect(putMock).toBeCalledTimes(0);
        expect(fetch).toBeCalledTimes(0);

        done();
    });

    test("cacheOnly on successful match", async (done) => {
        const strategy = strategies.cacheOnly();

        await strategy(context);

        expect(context.response instanceof Response).toBeTruthy();

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(1);
        expect(putMock).toBeCalledTimes(0);
        expect(fetch).toBeCalledTimes(0);

        done();
    });

    test("networkFirst nothing cached with successful fetch", async (done) => {
        const strategy = strategies.networkFirst();

        await strategy(context);

        expect(context.response instanceof Response).toBeTruthy();

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(0);
        expect(fetch).toBeCalledTimes(1);

        done();
    });

    test("networkFirst nothing cached with failed fetch", async (done) => {
        const strategy = strategies.networkFirst();

        matchResponse = null;

        fetchResponse = notFoundResponse;

        await strategy(context);

        expect(context.response).toBe(null);

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(1);
        expect(putMock).toBeCalledTimes(0);
        expect(fetch).toBeCalledTimes(1);

        done();
    });

    test("networkFirst something fetched", async (done) => {
        const strategy = strategies.networkFirst();

        await strategy(context);

        expect(context.response instanceof Response).toBeTruthy();

        expect(caches.open).toBeCalledTimes(1);
        expect(matchMock).toBeCalledTimes(0);
        expect(fetch).toBeCalledTimes(1);

        done();
    });

    test("networkOnly on failed fetch", async (done) => {
        const strategy = strategies.networkOnly();

        fetchResponse = notFoundResponse;

        await strategy(context);

        expect(context.response instanceof Promise).toBeTruthy();

        const response = await context.response;

        expect(response).toStrictEqual(notFoundResponse);

        expect(caches.open).toBeCalledTimes(0);
        expect(matchMock).toBeCalledTimes(0);
        expect(putMock).toBeCalledTimes(0);
        expect(fetch).toBeCalledTimes(1);

        done();
    });

    test("networkOnly on successful fetch", async (done) => {
        const strategy = strategies.networkOnly();

        await strategy(context);

        expect(context.response instanceof Promise).toBeTruthy();

        await context.response;

        expect(caches.open).toBeCalledTimes(0);
        expect(matchMock).toBeCalledTimes(0);
        expect(putMock).toBeCalledTimes(0);
        expect(fetch).toBeCalledTimes(1);

        done();
    });
});
