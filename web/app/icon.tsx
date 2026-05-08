import { ImageResponse } from "next/og"
import { brandPalette } from "@/lib/brand-palette"

export const size = {
  width: 32,
  height: 32,
}

export const contentType = "image/png"

export default function Icon() {
  const palette = brandPalette

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: palette.background,
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 512 512" fill="none">
          <rect width="512" height="512" rx="112" fill={palette.background} />
          <path d="M256 112L368 160V252C368 325.56 322.12 391.222 256 416C189.88 391.222 144 325.56 144 252V160L256 112Z" fill={palette.foreground} />
          <path d="M256 158L330 189.714V250.348C330 298.062 301.549 342.002 256 360C210.451 342.002 182 298.062 182 250.348V189.714L256 158Z" fill={palette.background} />
          <path d="M256 194L302 213.594V249.517C302 283.228 282.302 312.661 256 326C229.698 312.661 210 283.228 210 249.517V213.594L256 194Z" fill={palette.foreground} />
          <path d="M237.793 270.69L208.621 241.517L223.138 227L237.793 241.655L289 190.448L303.517 204.966L237.793 270.69Z" fill={palette.background} />
        </svg>
      </div>
    ),
    size
  )
}
