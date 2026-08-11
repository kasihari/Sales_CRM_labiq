import BottomNav from "@/components/BottomNav";

// Shell for the salesperson area: a phone-width column with bottom nav.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-100">
      <div className="flex-1 pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}
