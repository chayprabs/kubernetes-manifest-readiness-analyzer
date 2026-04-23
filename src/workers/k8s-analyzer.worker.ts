import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import type {
  K8sAnalyzerWorkerErrorMessage,
  K8sAnalyzerWorkerRequestMessage,
  K8sAnalyzerWorkerSafeError,
  K8sAnalyzerWorkerSuccessMessage,
} from "@/lib/k8s/analyzer-worker-client";

const workerScope = globalThis as typeof globalThis & {
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<K8sAnalyzerWorkerRequestMessage>) => void,
  ) => void;
  postMessage: (message: unknown) => void;
};

workerScope.addEventListener(
  "message",
  (event: MessageEvent<K8sAnalyzerWorkerRequestMessage>) => {
    const message = event.data;

    if (!message || message.type !== "analyze") {
      return;
    }

    try {
      const report = analyzeK8sManifests(message.raw, message.options, {
        onProgress(progress) {
          workerScope.postMessage({
            type: "progress",
            requestId: message.requestId,
            progress,
          });
        },
      });

      workerScope.postMessage({
        type: "success",
        requestId: message.requestId,
        report,
      } satisfies K8sAnalyzerWorkerSuccessMessage);
    } catch (error) {
      workerScope.postMessage({
        type: "error",
        requestId: message.requestId,
        error: serializeWorkerError(error),
      } satisfies K8sAnalyzerWorkerErrorMessage);
    }
  },
);

function serializeWorkerError(error: unknown): K8sAnalyzerWorkerSafeError {
  if (error instanceof Error) {
    return {
      code: "analysis-failed",
      message: error.message,
      recoverable: true,
    };
  }

  return {
    code: "analysis-failed",
    message: "The background analysis worker failed unexpectedly.",
    recoverable: true,
  };
}

export {};
