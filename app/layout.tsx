import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Dragon Deck",
  description: "中国越境ECの案件とQAを管理するMVPボード"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
