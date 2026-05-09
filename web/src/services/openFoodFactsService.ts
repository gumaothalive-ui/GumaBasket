/**
 * Open Food Facts + Open Prices API Service
 * 
 * Strategy:
 * 1. Open Food Facts (world.openfoodfacts.org) → Product names, descriptions, categories
 * 2. Open Prices (prices.openfoodfacts.org) → REAL supermarket prices in EUR
 * 3. Convert EUR → ZAR (~19x rate), then add GUMA BASKET's 15% markup
 * 4. Replace user-submitted images with curated, premium Unsplash photography
 *
 * No API key required. Both APIs are free and open.
 */

// EUR to ZAR exchange rate (approximate, close to real rate)
const EUR_TO_ZAR = 19.5;
// GUMA BASKET 15% margin on top of supplier price
const MARKUP = 1.15;

// Curated premium product images per category
const PREMIUM_IMAGES: Record<string, string[]> = {
  'fruit-veg': [
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1592924357236-80ee25884b2f?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=500&h=500&fit=crop&q=90',
  ],
  'meat-poultry': [
    'https://images.unsplash.com/photo-1546248136-3d63d9115b9b?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1529693662653-9d480530a697?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1558030006-450675393462?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=500&h=500&fit=crop&q=90',
  ],
  'dairy': [
    'https://images.unsplash.com/photo-1563636619-e9107da5a76a?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1587241321921-91a834d6d191?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=500&h=500&fit=crop&q=90',
  ],
  'bakery': [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1549931319-a545dcf3bc7b?w=500&h=500&fit=crop&q=90',
  ],
  'sweets': [
    'https://images.unsplash.com/photo-1570197788417-0e1f3be1e627?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500&h=500&fit=crop&q=90',
  ],
  'pantry': [
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1599598425947-5202edd56fda?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=500&fit=crop&q=90',
    'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&h=500&fit=crop&q=90',
  ]
};

// OFF category slug → our store category
const OFF_CATEGORY_TO_STORE: Record<string, string> = {
  'vegetables': 'fruit-veg',
  'fruits': 'fruit-veg',
  'meats': 'meat-poultry',
  'poultry': 'meat-poultry',
  'dairy-products': 'dairy',
  'cheeses': 'dairy',
  'breads': 'bakery',
  'pastries': 'bakery',
  'ice-creams': 'sweets',
  'chocolates': 'sweets',
  'breakfast-cereals': 'pantry',
  'condiments': 'pantry',
};

// Open Prices API category slugs to query per store category
const STORE_TO_PRICE_CATEGORY: Record<string, string> = {
  'fruit-veg':    'en:vegetables',
  'meat-poultry': 'en:meats',
  'dairy':        'en:dairy-products',
  'bakery':       'en:breads',
  'sweets':       'en:ice-creams',
  'pantry':       'en:condiments',
};

export interface OFFProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  base_price: number;      // Real supplier price in ZAR (from supermarket)
  premium_price: number;   // GUMA BASKET price = base_price × 1.15
  unit: string;
  stock_quantity: number;
  image_url: string;
  supplier_id: string;
  rating: number;
  reviewCount: number;
  price_source?: string;   // e.g. "Woolworths FR" or "Checkers UK"
}

function r(n: number) { return Math.round(n * 100) / 100; }

function getPremiumImage(category: string, index: number): string {
  const imgs = PREMIUM_IMAGES[category] || PREMIUM_IMAGES['pantry'];
  return imgs[index % imgs.length];
}

/**
 * Fetches REAL prices from Open Prices (crowdsourced from real supermarkets globally),
 * then pulls product names from the Open Food Facts API.
 */
export async function fetchProductsByCategory(storeCategory: string, limit = 6): Promise<OFFProduct[]> {
  const priceCategory = STORE_TO_PRICE_CATEGORY[storeCategory];
  if (!priceCategory) return [];

  try {
    // Step 1: Get real prices from Open Prices API
    const pricesRes = await fetch(
      `https://prices.openfoodfacts.org/api/v1/prices?category_tag=${encodeURIComponent(priceCategory)}&currency=EUR&size=${limit * 5}&order_by=-date`,
      {
        next: { revalidate: 3600 },
        headers: { 'User-Agent': 'GUMA BASKET/1.0 (contact@GUMA BASKET.co.za)' }
      }
    );

    if (!pricesRes.ok) throw new Error(`Open Prices API error: ${pricesRes.status}`);
    const pricesData = await pricesRes.json();
    const priceItems: any[] = pricesData.items || [];

    const products: OFFProduct[] = [];

    for (const item of priceItems) {
      if (products.length >= limit) break;

      // Skip entries without a price
      const eurPrice = item.price;
      if (!eurPrice || eurPrice <= 0) continue;

      // Get product name - prefer category_tag label, fall back to product from linked data
      const productName = item.product?.product_name || item.product_name;
      if (!productName || /[^\x00-\x7F]/.test(productName)) continue; // English only

      const productCode = item.product_code || item.product?.code;
      if (!productCode) continue;

      // Convert EUR → ZAR
      const zarBasePrice = r(eurPrice * EUR_TO_ZAR);
      // Apply 15% GUMA BASKET markup
      const zarMarkupPrice = r(zarBasePrice * MARKUP);

      const storeName = item.location?.osm_name || 'International Supplier';

      products.push({
        id: `open-prices-${productCode}`,
        title: productName.trim(),
        description: `Premium ${productName.trim()} sourced from ${storeName}.`,
        category: storeCategory,
        base_price: zarBasePrice,
        premium_price: zarMarkupPrice,
        unit: item.product?.product_quantity
          ? `${item.product.product_quantity}${item.product.product_quantity_unit || 'g'}`
          : 'ea',
        stock_quantity: 20 + Math.floor(Math.random() * 80),
        image_url: getPremiumImage(storeCategory, products.length),
        supplier_id: 'open-prices',
        rating: 3 + Math.floor(Math.random() * 3),
        reviewCount: 10 + Math.floor(Math.random() * 250),
        price_source: storeName,
      });
    }

    return products;
  } catch (err) {
    console.warn(`[OpenPrices] Failed to fetch ${storeCategory}:`, err);
    return [];
  }
}

export async function fetchAllRealProducts(): Promise<OFFProduct[]> {
  const categories = Object.keys(STORE_TO_PRICE_CATEGORY);
  const results = await Promise.allSettled(
    categories.map(cat => fetchProductsByCategory(cat, 6))
  );
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}
