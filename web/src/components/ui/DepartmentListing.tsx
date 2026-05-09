import { fetchSAProducts } from '@/services/marketplaceService';
import { DepartmentListingClient } from './DepartmentListingClient';

interface DepartmentListingProps {
  title: string;
  category: string;
}

export { DepartmentListingClient };

export default async function DepartmentListing({ title, category }: DepartmentListingProps) {
  let products: any[] = [];
  try {
    const allProducts = await fetchSAProducts(1, 400);
    products = allProducts
      .filter(p => p.category === category)
      .sort((a, b) => a.premium_price - b.premium_price); 
  } catch (err) {
    console.error(`[DepartmentListing] Error loading ${category}:`, err);
  }

  return (
    <DepartmentListingClient
      title={title}
      category={category}
      products={products}
    />
  );
}
