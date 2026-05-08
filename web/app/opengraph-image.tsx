import { ImageResponse } from "next/og"
import { brandPalette } from "@/lib/brand-palette"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

export default function OpenGraphImage() {
  const palette = brandPalette

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: palette.background,
          color: palette.foreground,
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          padding: "64px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "20px",
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: palette.surface,
                border: `2px solid ${palette.foreground}`,
                borderRadius: "28px",
                display: "flex",
                height: "96px",
                justifyContent: "center",
                width: "96px",
              }}
            >
              <svg width="58" height="58" viewBox="0 0 512 512" fill="none">
                <path d="M256 112L368 160V252C368 325.56 322.12 391.222 256 416C189.88 391.222 144 325.56 144 252V160L256 112Z" fill={palette.foreground} />
                <path d="M256 158L330 189.714V250.348C330 298.062 301.549 342.002 256 360C210.451 342.002 182 298.062 182 250.348V189.714L256 158Z" fill={palette.background} />
                <path d="M256 194L302 213.594V249.517C302 283.228 282.302 312.661 256 326C229.698 312.661 210 283.228 210 249.517V213.594L256 194Z" fill={palette.foreground} />
                <path d="M237.793 270.69L208.621 241.517L223.138 227L237.793 241.655L289 190.448L303.517 204.966L237.793 270.69Z" fill={palette.background} />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "54px", fontWeight: 700 }}>Gatewarden</div>
              <div style={{ color: palette.muted, fontSize: "22px" }}>
                Open-source security gateway for self-hosted apps
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "860px" }}>
            <div style={{ fontSize: "72px", fontWeight: 700, lineHeight: 1.05 }}>
              Deterministic enforcement for the reverse-proxy edge
            </div>
            <div style={{ color: palette.subtle, fontSize: "30px", lineHeight: 1.4 }}>
              Caddy-first. Trusted identity headers. Reviewable AI suggestions. Events, rules, approvals, and observability in one control plane.
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
