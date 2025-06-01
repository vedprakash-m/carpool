// Generate static params for dynamic routes during static export
export async function generateStaticParams() {
  // For static export, we'll generate a placeholder set of common trip IDs
  // In a real scenario, you might fetch this from your API during build time
  const commonTripIds = ['new', 'template', 'example', 'placeholder-1', 'placeholder-2'];
  
  return commonTripIds.map((id) => ({
    id: id,
  }));
}

// This is a placeholder component - the actual routing will be handled by nested pages
export default function TripPage() {
  return null;
} 