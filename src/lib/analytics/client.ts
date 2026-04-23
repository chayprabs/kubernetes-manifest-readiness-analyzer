"use client";

import type {
  AnalyticsClientErrorReport,
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsEventPayloadInput,
} from "@/lib/analytics/events";
import {
  sanitizeAnalyticsEvent,
  sanitizeClientErrorReport,
} from "@/lib/analytics/events";

/**
 * Privacy guardrail:
 * Analytics stays disabled unless an explicit public environment variable opts
 * into a provider. The default client is a strict no-op so local analysis and
 * the rest of the app work unchanged without any telemetry backend.
 */
type AnalyticsProvider = {
  enabled: boolean;
  track: (event: AnalyticsEvent) => void | Promise<void>;
  reportError: (
    error: AnalyticsClientErrorReport,
  ) => void | Promise<void>;
};

type AnalyticsEnvelope =
  | {
      type: "analytics_event";
      event: AnalyticsEvent;
    }
  | {
      type: "client_error";
      error: AnalyticsClientErrorReport;
    };

let analyticsProvider: AnalyticsProvider | null = null;

export function isAnalyticsEnabled() {
  return getAnalyticsProvider().enabled;
}

export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  payload: AnalyticsEventPayloadInput = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  const event = sanitizeAnalyticsEvent(name, payload);

  if (!event) {
    return;
  }

  void getAnalyticsProvider().track(event);
}

export function reportClientBoundaryError(
  error: unknown,
  context: {
    route?: unknown;
    toolId?: unknown;
    browserLocale?: unknown;
    digest?: unknown;
  } = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  const sanitizedError = sanitizeClientErrorReport(error, context);
  void getAnalyticsProvider().reportError(sanitizedError);
}

function getAnalyticsProvider() {
  if (analyticsProvider) {
    return analyticsProvider;
  }

  analyticsProvider = resolveAnalyticsProvider();
  return analyticsProvider;
}

function resolveAnalyticsProvider(): AnalyticsProvider {
  const providerName = process.env.NEXT_PUBLIC_AUTHOS_ANALYTICS_PROVIDER;
  const endpoint = process.env.NEXT_PUBLIC_AUTHOS_ANALYTICS_ENDPOINT;

  if (providerName === "custom-endpoint" && endpoint) {
    return createCustomEndpointProvider(endpoint);
  }

  return createNoopAnalyticsProvider();
}

function createNoopAnalyticsProvider(): AnalyticsProvider {
  return {
    enabled: false,
    track() {},
    reportError() {},
  };
}

function createCustomEndpointProvider(endpoint: string): AnalyticsProvider {
  const normalizedEndpoint = endpoint.trim();

  if (!normalizedEndpoint) {
    return createNoopAnalyticsProvider();
  }

  return {
    enabled: true,
    track(event) {
      return postEnvelope(normalizedEndpoint, {
        type: "analytics_event",
        event,
      });
    },
    reportError(error) {
      return postEnvelope(normalizedEndpoint, {
        type: "client_error",
        error,
      });
    },
  };
}

function postEnvelope(endpoint: string, envelope: AnalyticsEnvelope) {
  const body = JSON.stringify(envelope);

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], {
      type: "application/json;charset=utf-8",
    });

    if (navigator.sendBeacon(endpoint, blob)) {
      return Promise.resolve();
    }
  }

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
    keepalive: true,
    credentials: "omit",
  })
    .then(() => undefined)
    .catch(() => undefined);
}
