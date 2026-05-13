import { AppHeader } from "@/components/app-header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader />
      <main id="main-content" aria-label="主内容区域" className="flex flex-1 flex-col">
        {children}
      </main>
    </>
  );
}
