// Static params generation for build-time export
export async function generateStaticParams() {
  // For static export, we need to provide some default params
  // In a real application, you might fetch trip IDs from an API
  // For now, we'll generate some placeholder IDs
  return [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }];
}

// Mark the page component as client-side only
import TripDetailPageClient from "./client-page";

export default function TripDetailPage() {
  return <TripDetailPageClient />;
}
