import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    let url = "";
    let method = "GET";

    if (typeof input === "string") {
      url = input;
      method = (init && init.method) || "GET";
    } else if (input instanceof URL) {
      url = input.href;
      method = (init && init.method) || "GET";
    } else if (input instanceof Request) {
      url = input.url;
      method = input.method;
    }

    const isApi = url.includes("/api/");

    if (isApi) {
      if (input instanceof Request) {
        const newInit: RequestInit = {
          credentials: "include",
        };

        if (init) {
          Object.assign(newInit, init);
        }

        const upperMethod = method.toUpperCase();
        if (["POST", "PUT", "DELETE"].includes(upperMethod)) {
          const match = document.cookie.match(/(?:^|;)\s*(csrf_token|X-Frappe-CSRF-Token)=([^;]+)/);
          const csrfToken = match ? decodeURIComponent(match[2]) : "";
          if (csrfToken) {
            const headers = new Headers(init?.headers || input.headers);
            if (!headers.has("X-Frappe-CSRF-Token")) {
              headers.set("X-Frappe-CSRF-Token", csrfToken);
            }
            newInit.headers = headers;
          }
        }

        const newRequest = new Request(input, newInit);
        return originalFetch.call(this, newRequest);
      } else {
        init = init || {};
        init.credentials = "include";

        const upperMethod = method.toUpperCase();
        if (["POST", "PUT", "DELETE"].includes(upperMethod)) {
          const match = document.cookie.match(/(?:^|;)\s*(csrf_token|X-Frappe-CSRF-Token)=([^;]+)/);
          const csrfToken = match ? decodeURIComponent(match[2]) : "";
          if (csrfToken) {
            let headers = init.headers;
            if (!headers) {
              headers = {};
              init.headers = headers;
            }

            if (headers instanceof Headers) {
              if (!headers.has("X-Frappe-CSRF-Token")) {
                headers.set("X-Frappe-CSRF-Token", csrfToken);
              }
            } else if (Array.isArray(headers)) {
              const hasCsrf = headers.some(([key]) => key.toLowerCase() === "x-frappe-csrf-token");
              if (!hasCsrf) {
                headers.push(["X-Frappe-CSRF-Token", csrfToken]);
              }
            } else {
              const hasCsrf = Object.keys(headers).some(key => key.toLowerCase() === "x-frappe-csrf-token");
              if (!hasCsrf) {
                (headers as Record<string, string>)["X-Frappe-CSRF-Token"] = csrfToken;
              }
            }
          }
        }
      }
    }
    return originalFetch.call(this, input, init);
  };
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    // Served by Frappe at /procurex/* (see hooks.py website_route_rules), not at the site root.
    basepath: "/procurex",
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: false,
    defaultPreloadStaleTime: 30000,
  });

  return router;
};
