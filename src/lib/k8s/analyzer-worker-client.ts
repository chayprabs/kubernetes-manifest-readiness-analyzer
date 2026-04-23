import type {
  K8sAnalysisProgressUpdate,
  K8sAnalysisReport,
  K8sAnalyzerOptions,
} from "@/lib/k8s/types";

export type K8sAnalyzerWorkerSafeErrorCode =
  | "worker-unavailable"
  | "worker-init-failed"
  | "worker-runtime-error"
  | "analysis-failed"
  | "aborted";

export type K8sAnalyzerWorkerSafeError = {
  code: K8sAnalyzerWorkerSafeErrorCode;
  message: string;
  recoverable: boolean;
};

export type K8sAnalyzerWorkerRequestMessage = {
  type: "analyze";
  requestId: number;
  raw: string;
  options: K8sAnalyzerOptions;
};

export type K8sAnalyzerWorkerProgressMessage = {
  type: "progress";
  requestId: number;
  progress: K8sAnalysisProgressUpdate;
};

export type K8sAnalyzerWorkerSuccessMessage = {
  type: "success";
  requestId: number;
  report: K8sAnalysisReport;
};

export type K8sAnalyzerWorkerErrorMessage = {
  type: "error";
  requestId: number;
  error: K8sAnalyzerWorkerSafeError;
};

export type K8sAnalyzerWorkerMessage =
  | K8sAnalyzerWorkerProgressMessage
  | K8sAnalyzerWorkerSuccessMessage
  | K8sAnalyzerWorkerErrorMessage;

export type K8sAnalyzerWorkerLike = Pick<
  Worker,
  "addEventListener" | "removeEventListener" | "postMessage" | "terminate"
>;

type K8sAnalyzerWorkerFactory = () => K8sAnalyzerWorkerLike;

type ActiveWorkerRequest = {
  requestId: number;
  resolve: (report: K8sAnalysisReport) => void;
  reject: (error: Error) => void;
  onProgress?: ((progress: K8sAnalysisProgressUpdate) => void) | undefined;
  signal?: AbortSignal | undefined;
  abortHandler?: (() => void) | undefined;
};

type AnalyzeWithWorkerInput = {
  raw: string;
  options?: K8sAnalyzerOptions;
  onProgress?: ((progress: K8sAnalysisProgressUpdate) => void) | undefined;
  signal?: AbortSignal | undefined;
};

export class K8sAnalyzerWorkerClientError extends Error {
  readonly code: K8sAnalyzerWorkerSafeErrorCode;
  readonly recoverable: boolean;

  constructor({ code, message, recoverable }: K8sAnalyzerWorkerSafeError) {
    super(message);
    this.name = "K8sAnalyzerWorkerClientError";
    this.code = code;
    this.recoverable = recoverable;
  }
}

export class K8sAnalyzerWorkerClient {
  private worker: K8sAnalyzerWorkerLike | null = null;
  private activeRequest: ActiveWorkerRequest | null = null;
  private requestCounter = 0;

  constructor(
    private readonly workerFactory: K8sAnalyzerWorkerFactory = createDefaultK8sAnalyzerWorker,
  ) {}

  analyze({ raw, options = {}, onProgress, signal }: AnalyzeWithWorkerInput) {
    if (signal?.aborted) {
      return Promise.reject(
        createAbortError("The analysis request was aborted."),
      );
    }

    this.cancelActiveRequest(
      createAbortError("A newer analysis request replaced the previous one."),
    );

    const worker = this.ensureWorker();
    const requestId = ++this.requestCounter;

    return new Promise<K8sAnalysisReport>((resolve, reject) => {
      const request: ActiveWorkerRequest = {
        requestId,
        resolve,
        reject,
        onProgress,
        signal,
      };

      if (signal) {
        request.abortHandler = () => {
          if (this.activeRequest?.requestId !== requestId) {
            return;
          }

          this.cancelActiveRequest(
            createAbortError("The analysis request was aborted."),
          );
        };

        signal.addEventListener("abort", request.abortHandler, { once: true });
      }

      this.activeRequest = request;
      worker.postMessage({
        type: "analyze",
        requestId,
        raw,
        options,
      } satisfies K8sAnalyzerWorkerRequestMessage);
    });
  }

  dispose() {
    this.cancelActiveRequest(
      createAbortError("The analyzer worker session was closed."),
    );
    this.disposeWorker();
  }

  private ensureWorker() {
    if (this.worker) {
      return this.worker;
    }

    const worker = this.workerFactory();

    worker.addEventListener("message", this.handleMessage as EventListener);
    worker.addEventListener("error", this.handleError as EventListener);
    this.worker = worker;

    return worker;
  }

  private cancelActiveRequest(error: Error) {
    if (!this.activeRequest) {
      return;
    }

    const request = this.activeRequest;
    this.cleanupActiveRequest();
    this.disposeWorker();
    request.reject(error);
  }

  private cleanupActiveRequest() {
    if (!this.activeRequest) {
      return;
    }

    const { signal, abortHandler } = this.activeRequest;

    if (signal && abortHandler) {
      signal.removeEventListener("abort", abortHandler);
    }

    this.activeRequest = null;
  }

  private disposeWorker() {
    if (!this.worker) {
      return;
    }

    this.worker.removeEventListener(
      "message",
      this.handleMessage as EventListener,
    );
    this.worker.removeEventListener("error", this.handleError as EventListener);
    this.worker.terminate();
    this.worker = null;
  }

  private readonly handleMessage = (
    event: MessageEvent<K8sAnalyzerWorkerMessage>,
  ) => {
    const message = event.data;
    const request = this.activeRequest;

    if (!message || !request || message.requestId !== request.requestId) {
      return;
    }

    if (message.type === "progress") {
      request.onProgress?.(message.progress);
      return;
    }

    this.cleanupActiveRequest();

    if (message.type === "success") {
      request.resolve(message.report);
      return;
    }

    request.reject(new K8sAnalyzerWorkerClientError(message.error));
  };

  private readonly handleError = () => {
    if (!this.activeRequest) {
      this.disposeWorker();
      return;
    }

    const request = this.activeRequest;
    this.cleanupActiveRequest();
    this.disposeWorker();
    request.reject(
      new K8sAnalyzerWorkerClientError({
        code: "worker-runtime-error",
        message:
          "The background analysis worker stopped unexpectedly during local analysis.",
        recoverable: true,
      }),
    );
  };
}

export function createK8sAnalyzerWorkerClient(
  workerFactory?: K8sAnalyzerWorkerFactory,
) {
  return new K8sAnalyzerWorkerClient(workerFactory);
}

export function isK8sAnalyzerAbortError(error: unknown) {
  return (
    error instanceof K8sAnalyzerWorkerClientError && error.code === "aborted"
  );
}

function createDefaultK8sAnalyzerWorker() {
  if (typeof Worker === "undefined") {
    throw new K8sAnalyzerWorkerClientError({
      code: "worker-unavailable",
      message: "Web workers are not available in this browser session.",
      recoverable: true,
    });
  }

  try {
    return new Worker(
      new URL("../../workers/k8s-analyzer.worker.ts", import.meta.url),
      {
        name: "k8s-analyzer",
        type: "module",
      },
    );
  } catch {
    throw new K8sAnalyzerWorkerClientError({
      code: "worker-init-failed",
      message: "The local analysis worker could not be started.",
      recoverable: true,
    });
  }
}

function createAbortError(message: string) {
  return new K8sAnalyzerWorkerClientError({
    code: "aborted",
    message,
    recoverable: true,
  });
}
