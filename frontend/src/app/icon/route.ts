import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const size = searchParams.get("size") || "192";

  // Generate a simple SVG icon for the app
  const iconSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" fill="#3b82f6" rx="24"/>
      <g fill="white">
        <path d="M48 96c0-26.51 21.49-48 48-48s48 21.49 48 48v24H48V96z"/>
        <rect x="40" y="112" width="112" height="8" rx="4"/>
        <rect x="40" y="128" width="112" height="8" rx="4"/>
        <rect x="40" y="144" width="112" height="8" rx="4"/>
        <circle cx="72" cy="80" r="4"/>
        <circle cx="120" cy="80" r="4"/>
        <path d="M80 100c0-8.84 7.16-16 16-16s16 7.16 16 16"/>
      </g>
    </svg>
  `;

  return new NextResponse(iconSvg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
