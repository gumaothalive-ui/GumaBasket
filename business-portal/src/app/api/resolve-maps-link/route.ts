import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });

  try {
    // Follow the redirect chain to get the full Google Maps URL
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GumaBaketBot/1.0)',
      },
    });

    const finalUrl = response.url;

    // Extract coordinates from the resolved URL: @lat,lng,zoom
    const coordMatch = finalUrl.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
    if (coordMatch) {
      const lat = coordMatch[1];
      const lon = coordMatch[2];

      // Reverse geocode for human-readable address (free, no API key)
      let address = `${lat}, ${lon}`;
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          { headers: { 'User-Agent': 'GumaBasket/1.0 (contact@gumabasket.co.za)' } }
        );
        const geoData = await geoRes.json();
        if (geoData.display_name) address = geoData.display_name;
      } catch {}

      return NextResponse.json({ lat, lon, address, resolved_url: finalUrl });
    }

    // Try place/Name/@lat,lng pattern
    const placeMatch = finalUrl.match(/\/place\/([^\/]+)\/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
    if (placeMatch) {
      return NextResponse.json({
        lat: placeMatch[2],
        lon: placeMatch[3],
        address: decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')),
        resolved_url: finalUrl,
      });
    }

    return NextResponse.json({ error: 'Could not extract coordinates from this link', resolved_url: finalUrl }, { status: 422 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
