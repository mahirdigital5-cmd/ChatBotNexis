import "./globals.css";

export const metadata = {
  title: "ChatBotNexis",
  description: "Luxury WhatsApp Automation Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
