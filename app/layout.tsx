import type { Metadata } from "next";
import { UiThemeClient } from "./ui-theme-client";
import "./styles.css";
import "./phantom-china/tokens.css";
import "./phantom-china/layout.css";
import "./phantom-china/components.css";
import "./phantom-china/motion.css";
import "./phantom-china/responsive.css";

export const metadata: Metadata = {
  title: "Dragon Deck",
  description: "中国越境ECの案件とQAを管理するMVPボード"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-ui-theme="phantom-china" suppressHydrationWarning>
      <body>
        <UiThemeClient />
        {children}
      </body>
    </html>
  );
}
