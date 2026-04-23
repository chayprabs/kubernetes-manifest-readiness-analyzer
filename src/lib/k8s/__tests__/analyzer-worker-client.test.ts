import { describe, expect, it, vi } from "vitest";
import { analyzeK8sManifests, sampleBrokenManifest } from "@/lib/k8s/analyzer";
import {
  createK8sAnalyzerWorkerClient,
  type K8sAnalyzerWorkerLike,
  type K8sAnalyzerWorkerMessage,
  type K8sAnalyzerWorkerRequestMessage,
} from "@/lib/k8s/analyzer-worker-client";

describe("K8sAnalyzerWorkerClient", () => {
  it("forwards progress updates and resolves the worker result", async () => {
    const worker = new FakeWorker();
    const client = createK8sAnalyzerWorkerClient(() => worker);
    const progressSpy = vi.fn();
    const report = analyzeK8sManifests(sampleBrokenManifest);

    const promise = client.analyze({
      raw: sampleBrokenManifest,
      onProgress: progressSpy,
    });
    const request = worker.lastRequest;

    expect(request).toMatchObject({
      type: "analyze",
      raw: sampleBrokenManifest,
    });

    worker.emitMessage({
      type: "progress",
      requestId: request.requestId,
      progress: {
        stage: "parse",
        progress: 18,
        message: "Analyzing locally...",
      },
    });
    worker.emitMessage({
      type: "success",
      requestId: request.requestId,
      report,
    });

    await expect(promise).resolves.toBe(report);
    expect(progressSpy).toHaveBeenCalledWith({
      stage: "parse",
      progress: 18,
      message: "Analyzing locally...",
    });

    client.dispose();
  });

  it("rejects stale work when a newer analysis request replaces it", async () => {
    const firstWorker = new FakeWorker();
    const secondWorker = new FakeWorker();
    const workerFactory = vi
      .fn<() => K8sAnalyzerWorkerLike>()
      .mockReturnValueOnce(firstWorker)
      .mockReturnValueOnce(secondWorker);
    const client = createK8sAnalyzerWorkerClient(workerFactory);
    const report = analyzeK8sManifests(sampleBrokenManifest);

    const firstPromise = client.analyze({ raw: "apiVersion: v1\nkind: Pod" });
    const firstRequest = firstWorker.lastRequest;
    const secondPromise = client.analyze({ raw: sampleBrokenManifest });
    const secondRequest = secondWorker.lastRequest;

    await expect(firstPromise).rejects.toMatchObject({
      code: "aborted",
      recoverable: true,
    });
    expect(firstWorker.terminated).toBe(true);

    firstWorker.emitMessage({
      type: "success",
      requestId: firstRequest.requestId,
      report,
    });
    secondWorker.emitMessage({
      type: "success",
      requestId: secondRequest.requestId,
      report,
    });

    await expect(secondPromise).resolves.toBe(report);

    client.dispose();
  });
});

class FakeWorker implements K8sAnalyzerWorkerLike {
  readonly requests: K8sAnalyzerWorkerRequestMessage[] = [];
  terminated = false;
  private readonly listeners = {
    message: new Set<(event: MessageEvent<K8sAnalyzerWorkerMessage>) => void>(),
    error: new Set<(event: Event) => void>(),
  };

  addEventListener(
    type: "message" | "error",
    listener: EventListenerOrEventListenerObject,
  ) {
    if (typeof listener !== "function") {
      return;
    }

    if (type === "message") {
      this.listeners.message.add(
        listener as (event: MessageEvent<K8sAnalyzerWorkerMessage>) => void,
      );
      return;
    }

    this.listeners.error.add(listener as (event: Event) => void);
  }

  removeEventListener(
    type: "message" | "error",
    listener: EventListenerOrEventListenerObject,
  ) {
    if (typeof listener !== "function") {
      return;
    }

    if (type === "message") {
      this.listeners.message.delete(
        listener as (event: MessageEvent<K8sAnalyzerWorkerMessage>) => void,
      );
      return;
    }

    this.listeners.error.delete(listener as (event: Event) => void);
  }

  postMessage(message: K8sAnalyzerWorkerRequestMessage) {
    this.requests.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emitMessage(message: K8sAnalyzerWorkerMessage) {
    for (const listener of this.listeners.message) {
      listener({ data: message } as MessageEvent<K8sAnalyzerWorkerMessage>);
    }
  }

  get lastRequest() {
    const request = this.requests.at(-1);

    if (!request) {
      throw new Error("Expected a worker request to have been posted.");
    }

    return request;
  }
}
