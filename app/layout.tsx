import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "中国越境EC 施策・QA管理ボード",
  description: "中国越境ECの案件とQAを管理するMVPボード"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
