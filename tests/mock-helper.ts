import * as makeServiceWorkerEnv from "service-worker-mock";
// @ts-ignore
import * as FetchEvent from "service-worker-mock/models/FetchEvent";
// @ts-ignore
import * as Request from "service-worker-mock/models/Request";
// @ts-ignore 
import * as Response from "service-worker-mock/models/Response";

declare var global: any;

export function mockInit() {
    Object.assign(global, makeServiceWorkerEnv(), {
        fetch: (request: RequestInfo): Promise<Response> => {
            const response = new Response("", {
                status: 200,
                statusText: "ok",
              });
            response.url = typeof(request) === "string" ? request : request.url;
            return Promise.resolve(response);
        },
    });
    jest.resetModules();
}

export function getFetchEvent(url: string, method?: string) {
    return new FetchEvent("FetchEvent", { 
        request: new Request(url, { method: method || "GET"}),
    });
}