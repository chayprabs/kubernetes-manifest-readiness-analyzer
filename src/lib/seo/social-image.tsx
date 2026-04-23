import { ImageResponse } from "next/og";
import { latestSupportedKubernetesTargetVersion } from "@/lib/k8s/deprecations";

export const socialImageSize = {
  width: 1200,
  height: 630,
} as const;

export const socialImageContentType = "image/png";

type CreateSocialImageOptions = {
  eyebrow: string;
  title: string;
  description: string;
  footer: string;
};

export function createAuthosSocialImage({
  eyebrow,
  title,
  description,
  footer,
}: CreateSocialImageOptions) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #091223 0%, #122038 55%, #d9e4f5 55%, #eef4fb 100%)",
          color: "#eef4fb",
          padding: "56px",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            border: "1px solid rgba(217, 228, 245, 0.18)",
            borderRadius: 28,
            padding: "40px 44px",
            background: "rgba(9, 18, 35, 0.72)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              maxWidth: 760,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 22,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#8fb7ff",
              }}
            >
              <span>Authos</span>
              <span style={{ color: "rgba(143, 183, 255, 0.6)" }}>|</span>
              <span>{eyebrow}</span>
            </div>
            <div
              style={{
                fontSize: 62,
                lineHeight: 1.05,
                fontWeight: 700,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.35,
                color: "rgba(238, 244, 251, 0.88)",
                maxWidth: 860,
              }}
            >
              {description}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 22,
              color: "rgba(238, 244, 251, 0.82)",
            }}
          >
            <div>{footer}</div>
            <div>{`Checks through Kubernetes ${latestSupportedKubernetesTargetVersion}`}</div>
          </div>
        </div>
      </div>
    ),
    socialImageSize,
  );
}
