import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex items-center justify-center">{children}</div>
      <Toaster />
    </div>
  );
}
