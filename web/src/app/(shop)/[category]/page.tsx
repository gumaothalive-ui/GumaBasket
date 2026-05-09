import { DepartmentListingClient } from '@/components/ui/DepartmentListing';
import { fetchSAProducts } from '@/services/marketplaceService';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const validCategories = ['snacks', 'candy', 'chips', 'biscuits', 'chocolates', 'sweets', 'drinks', 'groceries', 'fruit-veg', 'meat-poultry', 'bakery', 'ready-meals', 'dairy', 'pantry', 'beverages', 'flowers', 'frozen', 'deli', 'toiletries', 'household', 'kids'];

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params;
  if (!validCategories.includes(resolvedParams.category)) {
    return notFound();
  }

  // Fetch all products server-side, pass to client component for filtering
  let products: any[] = [];
  try {
    const allProducts = await fetchSAProducts(1, 400);
    products = allProducts
      .filter(p => p.category === resolvedParams.category)
      .sort((a, b) => a.premium_price - b.premium_price);
  } catch (err) {
    console.error(`[CategoryPage] Error loading ${resolvedParams.category}:`, err);
  }

  const title = resolvedParams.category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <DepartmentListingClient
      title={title}
      category={resolvedParams.category}
      products={products}
    />
  );
}
