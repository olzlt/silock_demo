import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://silock-demo.vercel.app";
const description = "Silock에서 구매한 디지털 출판 콘텐츠를 서비스 종료 이후에도 오래 소장할 수 있도록 설계하는 오픈 마켓플레이스";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Silock",
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Silock",
    title: "Silock",
    description,
    url: "/",
    images: [{ url: "/open_graph.png", width: 1200, height: 630, alt: "Silock" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Silock",
    description,
    images: ["/open_graph.png"],
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&family=Noto+Serif+KR:wght@500;600;700;900&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
