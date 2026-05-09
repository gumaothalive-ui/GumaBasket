import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const vendorName = formData.get('vendorName') as string;

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const safeName = (vendorName || 'product').toLowerCase().replace(/\s+/g, '-');
    const fileName = `${safeName}-${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // Convert File to ArrayBuffer then Buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (err) {
    console.error('Upload route error:', err);
    return NextResponse.json({ success: false, error: 'Upload failed.' }, { status: 500 });
  }
}
