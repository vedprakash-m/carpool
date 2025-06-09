// Generate static params for export compatibility
export async function generateStaticParams() {
  // Return empty array since this is a dynamic admin page
  // that will be handled client-side
  return [];
}

// Import the client component
import GroupRequestsClient from "./client";

export default function GroupRequestsPage() {
  return <GroupRequestsClient />;
}
