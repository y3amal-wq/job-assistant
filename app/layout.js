import "./globals.css";

export const metadata = {
  title: "مساعدي المهني",
  description: "مساعد ذكي يرافقك من تحديد هدفك المهني إلى الحصول على وظيفة",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
