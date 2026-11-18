import type { Metadata } from "next";
import Script from "next/script";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

const EMBED_DETECT = `try{if(window.self!==window.top)document.documentElement.dataset.embed="1"}catch(e){document.documentElement.dataset.embed="1"}`;

export const metadata: Metadata = {
  title: "技能管理",
  description: "技能管理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" style={{ height: "100%" }}>
      <body style={{ height: "100%", margin: 0 }}>
        <Script id="embed-detect" strategy="beforeInteractive">
          {EMBED_DETECT}
        </Script>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
