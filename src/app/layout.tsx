import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/context/toast-context";
import { Header } from "@/components/Header";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { MobileTabs } from "@/components/MobileTabs";
import { PageTransition } from "@/components/PageTransition";
import "katex/dist/katex.min.css";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "나누다 · nanuda",
  description: "형식에 얽매이지 않고, 담고 싶은 것을 담습니다. 사진과 글, 코드와 회로, 벽에 걸린 한 점, 그리고 마음에 남은 한 문장까지.",
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
          <AuthProvider>
            <Header />
            <EmailVerificationBanner />
            {/* scrollbar-gutter reserves the scrollbar's width even on short pages, so navigating
                between a scrolling page and a non-scrolling one doesn't shift centered content
                horizontally when the scrollbar appears/disappears. */}
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-white [scrollbar-gutter:stable]">
              <PageTransition>{children}</PageTransition>
            </main>
            <MobileTabs />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
