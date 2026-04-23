import type { K8sRule } from "@/lib/k8s/types";
import {
  buildIngressTlsSnippet,
  createDocumentFinding,
  findServiceByName,
  formatHumanList,
  getIngressBackendRefs,
  getIngressDocuments,
  getIngressHosts,
  ingressHasTls,
  isStrictOrSecurityProfile,
} from "@/lib/k8s/rules/networking/shared";

export const ingressWithoutTlsRule: K8sRule = {
  id: "ingress-without-tls",
  title: "Ingress does not configure TLS",
  description:
    "Ingress routes without TLS leave transport security and certificate handling implicit instead of reviewable in the manifest.",
  category: "networking",
  defaultSeverity: "medium",
  run(context) {
    return getIngressDocuments(context).flatMap((document) => {
      if (ingressHasTls(document)) {
        return [];
      }

      return [
        createDocumentFinding(context, document, {
          ruleId: this.id,
          idSuffix: document.metadata.name ?? `document-${document.index}`,
          title: this.title,
          message: `Ingress "${document.metadata.name}" does not define spec.tls.`,
          severity: isStrictOrSecurityProfile(context) ? "high" : "medium",
          category: this.category,
          path: "spec.tls",
          whyItMatters:
            "Without explicit TLS configuration, external traffic may terminate insecurely or rely on behavior that is harder to verify during review.",
          recommendation:
            "Add a TLS block for the intended hosts and bind it to the certificate secret your ingress controller should use.",
          fix: {
            summary:
              "Add an Ingress TLS block for the real host and certificate secret.",
            yamlPath: "spec.tls",
            snippet: buildIngressTlsSnippet(),
          },
        }),
      ];
    });
  },
};

export const ingressBroadHostRule: K8sRule = {
  id: "ingress-broad-host",
  title: "Ingress host is missing or too broad",
  description:
    "Missing hosts or wildcard hosts make routing broader than a single reviewed domain and can catch more traffic than intended.",
  category: "networking",
  defaultSeverity: "medium",
  run(context) {
    return getIngressDocuments(context).flatMap((document) => {
      const hosts = getIngressHosts(document);

      if (hosts.length === 0) {
        return [
          createDocumentFinding(context, document, {
            ruleId: this.id,
            idSuffix: `${document.metadata.name ?? document.index}:missing`,
            title: this.title,
            message: `Ingress "${document.metadata.name}" defines rules without an explicit host.`,
            severity: "medium",
            category: this.category,
            path: "spec.rules",
            whyItMatters:
              "Hostless rules can match a broader range of requests than a specific domain, which makes exposure and ownership harder to review.",
            recommendation:
              "Set explicit hosts on Ingress rules unless broad catch-all routing is a deliberate design choice.",
          }),
        ];
      }

      const broadHosts = hosts.filter((host) => !host || host.includes("*"));

      if (broadHosts.length === 0) {
        return [];
      }

      return [
        createDocumentFinding(context, document, {
          ruleId: this.id,
          idSuffix: `${document.metadata.name ?? document.index}:wildcard`,
          title: this.title,
          message: `Ingress "${document.metadata.name}" uses broad host routing: ${formatHumanList(
            broadHosts.map((host) => host ?? "<missing host>"),
          )}.`,
          severity: "medium",
          category: this.category,
          path: "spec.rules",
          whyItMatters:
            "Wildcard or missing hosts can make one Ingress capture traffic for domains or requests that were not meant to share the same routing path.",
          recommendation:
            "Prefer explicit hostnames for production traffic unless wildcard routing is a reviewed requirement.",
        }),
      ];
    });
  },
};

export const ingressBackendServiceMissingRule: K8sRule = {
  id: "ingress-backend-service-missing",
  title: "Ingress backend Service is missing",
  description:
    "If an Ingress points at a Service that is not present in the manifest set, routing cannot be reviewed end to end.",
  category: "networking",
  defaultSeverity: "high",
  run(context) {
    return getIngressDocuments(context).flatMap((document) =>
      getIngressBackendRefs(document).flatMap((backend) => {
        if (
          !backend.serviceName ||
          findServiceByName(
            context,
            document.metadata.namespace ?? "default",
            backend.serviceName,
          )
        ) {
          return [];
        }

        return [
          createDocumentFinding(context, document, {
            ruleId: this.id,
            idSuffix: `${document.metadata.name ?? document.index}:${backend.serviceName}:${backend.pathExpression}`,
            title: this.title,
            message: `Ingress "${document.metadata.name}" references Service "${backend.serviceName}" at ${backend.pathExpression}, but no Service with that name was found in namespace "${document.metadata.namespace ?? "default"}".`,
            severity: "high",
            category: this.category,
            path: backend.pathExpression,
            whyItMatters:
              "An Ingress backend that points at a missing Service usually means requests will fail or the manifest set is incomplete for review.",
            recommendation:
              "Create the missing Service or update the Ingress backend reference so it points to the intended in-namespace Service.",
          }),
        ];
      }),
    );
  },
};
