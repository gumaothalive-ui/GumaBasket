$paths = @('web\src', 'business-portal\src')
$extensions = @('*.tsx', '*.ts', '*.css', '*.json', '*.html')

$files = $paths | ForEach-Object {
  Get-ChildItem -Path $_ -Recurse -Include $extensions -ErrorAction SilentlyContinue
}

$count = 0
foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
  if ($null -eq $content) { continue }
  if ($content -match 'DailyMarket|dailymarket|DAILYMARKET') {
    $new = $content `
      -replace 'DAILYMARKET BUSINESS', 'GUMA BASKET BUSINESS' `
      -replace 'DAILYMARKET', 'GUMA BASKET' `
      -replace 'DailyMarket Business', 'Guma Basket Business' `
      -replace 'DailyMarket Elite', 'Guma Basket Elite' `
      -replace 'DailyMarket Merchant', 'Guma Basket Merchant' `
      -replace 'DailyMarket Supplier', 'Guma Basket Supplier' `
      -replace 'DailyMarket Partner', 'Guma Basket Partner' `
      -replace 'DailyMarket Seller', 'Guma Basket Seller' `
      -replace 'DailyMarket Vendor', 'Guma Basket Vendor' `
      -replace 'DailyMarket Order', 'Guma Basket Order' `
      -replace 'DailyMarket Price', 'Guma Basket Price' `
      -replace 'DailyMarket', 'Guma Basket' `
      -replace 'dailymarket_cart', 'gumabasket_cart' `
      -replace 'dailymarket\.co\.za', 'gumabasket.co.za' `
      -replace 'dailymarket\.com', 'gumabasket.com' `
      -replace 'dailymarket380', 'gumabasket380'
    Set-Content -Path $file.FullName -Value $new -NoNewline
    $count++
    Write-Host "Updated: $($file.FullName)"
  }
}

Write-Host ""
Write-Host "Done. Total files updated: $count"
