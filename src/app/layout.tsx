import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/context/toast-context";
import { ConfirmProvider } from "@/context/confirm-context";
import { ProgressProvider } from "@/context/progress-context";
import { Header } from "@/components/Header";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { MobileTabs } from "@/components/MobileTabs";
import { PageTransition } from "@/components/PageTransition";
import { TopProgressBar } from "@/components/TopProgressBar";
import { Footer } from "@/components/Footer";
import "katex/dist/katex.min.css";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const SITE_DESCRIPTION =
  "형식에 얽매이지 않고, 담고 싶은 것을 담습니다. 사진과 글, 코드와 회로, 벽에 걸린 한 점, 그리고 마음에 남은 한 문장까지.";

export const metadata: Metadata = {
  // Required for every relative URL in child pages' metadata (og:image, canonical, etc.) to
  // resolve to an absolute one — without this, Next silently leaves them relative, which most
  // crawlers (Google included) either ignore or resolve incorrectly.
  metadataBase: new URL("https://nanuda.life"),
  // Not a title *template* — every page here already appends its own "· 나누다" suffix directly
  // (see post/[id]'s generateMetadata), and a template would double that up.
  title: "나누다 - 생각 공유 플랫폼",
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: "나누다",
    type: "website",
    locale: "ko_KR",
    title: "나누다 - 생각 공유 플랫폼",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "나누다 - 생각 공유 플랫폼",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={jetbrainsMono.variable}>
      <body className="h-dvh flex flex-col overflow-hidden bg-white text-[#0e0e0e] antialiased">
        {/* Pretendard isn't on Google Fonts, so it's loaded from the same CDN the design used.
            React 19 hoists <link>/<meta> rendered anywhere in the tree into <head> automatically. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <ProgressProvider>
                <Header />
                <TopProgressBar />
                <EmailVerificationBanner />
                {/* scrollbar-gutter reserves the scrollbar's width even on short pages, so navigating
                    between a scrolling page and a non-scrolling one doesn't shift centered content
                    horizontally when the scrollbar appears/disappears. */}
                {/* Footer renders inside PageTransition's own wrapper (not as a sibling after it)
                    because that wrapper is `h-full` — needed so a page like /art can stretch its
                    own min-h-full background to fill a short viewport — and a sibling placed after
                    an h-full div gets pushed to the bottom of the *viewport*, not the bottom of the
                    actual (possibly much shorter) page content. */}
                <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-white [scrollbar-gutter:stable]">
                  <PageTransition>
                    {children}
                    <Footer />
                  </PageTransition>
                </main>
                <MobileTabs />
              </ProgressProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
