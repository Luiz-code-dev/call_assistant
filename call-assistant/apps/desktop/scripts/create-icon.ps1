Add-Type -AssemblyName System.Drawing

function Add-RoundedRect($path, $x, $y, $w, $h, $r) {
    $path.AddArc($x,           $y,           $r*2, $r*2, 180, 90)
    $path.AddArc($x+$w-$r*2,  $y,           $r*2, $r*2, 270, 90)
    $path.AddArc($x+$w-$r*2,  $y+$h-$r*2,  $r*2, $r*2,   0, 90)
    $path.AddArc($x,           $y+$h-$r*2,  $r*2, $r*2,  90, 90)
    $path.CloseFigure()
}

$sizes   = @(256, 64, 48, 32, 16)
$pngData = @()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint  = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    $r    = [int]([Math]::Max($sz * 0.20, 2))
    $rp   = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-RoundedRect $rp 0 0 $sz $sz $r

    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        [System.Drawing.PointF]::new(0, 0),
        [System.Drawing.PointF]::new($sz, $sz),
        [System.Drawing.Color]::FromArgb(255, 6, 182, 212),
        [System.Drawing.Color]::FromArgb(255, 37, 99, 235)
    )
    $g.FillPath($grad, $rp)

    $fontSize = [Math]::Max([int]($sz * 0.58), 6)
    $font = New-Object System.Drawing.Font('Arial', $fontSize,
              [System.Drawing.FontStyle]::Bold,
              [System.Drawing.GraphicsUnit]::Pixel)
    $sf  = New-Object System.Drawing.StringFormat
    $sf.Alignment     = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, 0, $sz, $sz)
    $g.DrawString('S', $font, [System.Drawing.Brushes]::White, $rect, $sf)

    $g.Dispose(); $font.Dispose(); $grad.Dispose(); $rp.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngData += ,$ms.ToArray()
    $ms.Dispose(); $bmp.Dispose()
}

# Build ICO (PNG-in-ICO format supported by Windows Vista+)
$icoStream = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($icoStream)

$bw.Write([Int16]0)
$bw.Write([Int16]1)
$bw.Write([Int16]$sizes.Count)

$baseOffset = 6 + 16 * $sizes.Count
$offset = $baseOffset
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $sz = $sizes[$i]
    $wh = if ($sz -ge 256) { [Byte]0 } else { [Byte]$sz }
    $bw.Write($wh)
    $bw.Write($wh)
    $bw.Write([Byte]0)
    $bw.Write([Byte]0)
    $bw.Write([Int16]1)
    $bw.Write([Int16]32)
    $bw.Write([Int32]$pngData[$i].Length)
    $bw.Write([Int32]$offset)
    $offset += $pngData[$i].Length
}
foreach ($data in $pngData) { $bw.Write($data) }
$bw.Flush()

$outPath = "$PSScriptRoot\..\resources\icon.ico"
[System.IO.File]::WriteAllBytes((Resolve-Path "$PSScriptRoot\..").Path + "\resources\icon.ico", $icoStream.ToArray())
$bw.Dispose(); $icoStream.Dispose()

Write-Host "icon.ico criado em resources/icon.ico"
