import InfographicLoadingState from "@/components/infographic/InfographicLoadingState";

export default function Loading() {
  return (
    <main className="py-8 sm:py-12 lg:py-14">
      <div className="dashboard-container">
        <InfographicLoadingState label="กำลังเปิดข่าวสาร…" />
      </div>
    </main>
  );
}
