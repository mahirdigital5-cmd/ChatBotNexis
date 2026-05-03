import type { ReactNode } from "react";

export const metadata = {
  title: "ChatBotNexis",
  description: "AI chatbot dropship"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
