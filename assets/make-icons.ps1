param([string]$OutDir)
# Genera el icono de Clarify y sus variantes con GDI+ (System.Drawing)
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

function C([string]$hex, [int]$a = 255) {
  $hex = $hex.TrimStart('#')
  [System.Drawing.Color]::FromArgb($a, [Convert]::ToInt32($hex.Substring(0,2),16), [Convert]::ToInt32($hex.Substring(2,2),16), [Convert]::ToInt32($hex.Substring(4,2),16))
}

function RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function NewCanvas([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  return @($bmp, $g)
}

# Fondo: degradado de marca en diagonal + brillo suave arriba a la derecha
function DrawBackground($g, [int]$size, $clipPath) {
  $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (C 'FFA374'), (C 'D44E2A'), 45.0
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend 3
  $blend.Colors = @((C 'FFA374'), (C 'F26D45'), (C 'D44E2A'))
  $blend.Positions = @([float]0, [float]0.55, [float]1)
  $brush.InterpolationColors = $blend
  if ($clipPath) { $g.SetClip($clipPath) }
  $g.FillRectangle($brush, $rect)
  # Brillo
  $glow = New-Object System.Drawing.SolidBrush (C 'FFFFFF' 40)
  $g.FillEllipse($glow, [float]($size * 0.52), [float](-$size * 0.30), [float]($size * 0.80), [float]($size * 0.80))
  $glow2 = New-Object System.Drawing.SolidBrush (C 'FFFFFF' 22)
  $g.FillEllipse($glow2, [float](-$size * 0.35), [float]($size * 0.62), [float]($size * 0.70), [float]($size * 0.70))
  if ($clipPath) { $g.ResetClip() }
}

# Símbolo: esquinas de escáner + hoja blanca con líneas + destello IA.
# $cx,$cy = centro; $s = tamaño del símbolo (ancho total aprox.)
function DrawSymbol($g, [float]$cx, [float]$cy, [float]$s) {
  # Hoja
  $dw = $s * 0.50; $dh = $s * 0.62
  $dx = $cx - $dw / 2; $dy = $cy - $dh / 2
  $shadow = RoundRect ($dx + $s*0.012) ($dy + $s*0.03) $dw $dh ($s * 0.07)
  $g.FillPath((New-Object System.Drawing.SolidBrush (C '5A1E08' 55)), $shadow)
  $doc = RoundRect $dx $dy $dw $dh ($s * 0.07)
  $g.FillPath((New-Object System.Drawing.SolidBrush (C 'FFFFFF')), $doc)

  # Líneas de texto
  $lx = $dx + $dw * 0.17; $lw = $dw * 0.66; $lh = $s * 0.045
  $title = RoundRect $lx ($dy + $dh * 0.17) ($lw * 0.62) $lh ($lh / 2)
  $g.FillPath((New-Object System.Drawing.SolidBrush (C 'F26D45')), $title)
  $lineBrush = New-Object System.Drawing.SolidBrush (C 'F6C9B4')
  $ys = @(0.37, 0.52, 0.67)
  $ws = @(1.0, 0.86, 0.70)
  for ($i = 0; $i -lt 3; $i++) {
    $bar = RoundRect $lx ($dy + $dh * $ys[$i]) ($lw * $ws[$i]) ($lh * 0.8) ($lh * 0.4)
    $g.FillPath($lineBrush, $bar)
  }

  # Esquinas de escáner (alrededor de la hoja)
  $pad = $s * 0.13
  $bx = $dx - $pad; $by = $dy - $pad; $bw = $dw + $pad * 2; $bh = $dh + $pad * 2
  $arm = $s * 0.16
  $pen = New-Object System.Drawing.Pen (C 'FFFFFF'), ([float]($s * 0.05))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $corners = @(
    @(($bx), ($by + $arm), ($bx), ($by), ($bx + $arm), ($by)),
    @(($bx + $bw - $arm), ($by), ($bx + $bw), ($by), ($bx + $bw), ($by + $arm)),
    @(($bx), ($by + $bh - $arm), ($bx), ($by + $bh), ($bx + $arm), ($by + $bh)),
    @(($bx + $bw - $arm), ($by + $bh), ($bx + $bw), ($by + $bh), ($bx + $bw), ($by + $bh - $arm))
  )
  foreach ($k in $corners) {
    $pts = @(
      (New-Object System.Drawing.PointF ([float]$k[0]), ([float]$k[1])),
      (New-Object System.Drawing.PointF ([float]$k[2]), ([float]$k[3])),
      (New-Object System.Drawing.PointF ([float]$k[4]), ([float]$k[5]))
    )
    $g.DrawLines($pen, [System.Drawing.PointF[]]$pts)
  }

  # Destello IA (estrella de 4 puntas) sobre la esquina superior derecha de la hoja
  # Dentro de la hoja, en naranja, a la altura del título
  $sx = $dx + $dw * 0.76; $sy = $dy + $dh * 0.20; $r = $s * 0.068; $ri = $r * 0.27
  $star = New-Object System.Drawing.Drawing2D.GraphicsPath
  $sp = @()
  for ($i = 0; $i -lt 8; $i++) {
    $ang = [Math]::PI / 4 * $i - [Math]::PI / 2
    $rad = if ($i % 2 -eq 0) { $r } else { $ri }
    $sp += New-Object System.Drawing.PointF ([float]($sx + [Math]::Cos($ang) * $rad)), ([float]($sy + [Math]::Sin($ang) * $rad))
  }
  $star.AddPolygon([System.Drawing.PointF[]]$sp)
  $g.FillPath((New-Object System.Drawing.SolidBrush (C 'F26D45')), $star)
  # Destello pequeño
  $sx2 = $sx + $r * 1.05; $sy2 = $sy + $r * 0.95; $r2 = $r * 0.45; $ri2 = $r2 * 0.28
  $star2 = New-Object System.Drawing.Drawing2D.GraphicsPath
  $sp2 = @()
  for ($i = 0; $i -lt 8; $i++) {
    $ang = [Math]::PI / 4 * $i - [Math]::PI / 2
    $rad = if ($i % 2 -eq 0) { $r2 } else { $ri2 }
    $sp2 += New-Object System.Drawing.PointF ([float]($sx2 + [Math]::Cos($ang) * $rad)), ([float]($sy2 + [Math]::Sin($ang) * $rad))
  }
  $star2.AddPolygon([System.Drawing.PointF[]]$sp2)
  $g.FillPath((New-Object System.Drawing.SolidBrush (C 'FFA374')), $star2)
}

function Save($bmp, $g, [string]$name) {
  $g.Dispose()
  $path = Join-Path $OutDir $name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  "  $name"
}

New-Item -ItemType Directory -Force $OutDir | Out-Null
"Generando en $OutDir"

# 1) icon.png 1024 — cuadrado a sangre (iOS redondea las esquinas solo)
$c = NewCanvas 1024; DrawBackground $c[1] 1024 $null; DrawSymbol $c[1] 512 530 600; Save $c[0] $c[1] 'icon.png'

# 2) Android adaptable: fondo y símbolo por separado (símbolo dentro de la zona segura del 66 %)
$c = NewCanvas 1024; DrawBackground $c[1] 1024 $null; Save $c[0] $c[1] 'adaptive-bg.png'
$c = NewCanvas 1024; DrawSymbol $c[1] 512 525 510; Save $c[0] $c[1] 'adaptive-icon.png'

# Comprobación: símbolo adaptable sobre su fondo, con la máscara circular de Android
$bg = [System.Drawing.Image]::FromFile((Join-Path $OutDir 'adaptive-bg.png'))
$fg = [System.Drawing.Image]::FromFile((Join-Path $OutDir 'adaptive-icon.png'))
$chk = New-Object System.Drawing.Bitmap 1024, 1024
$cg = [System.Drawing.Graphics]::FromImage($chk)
$cg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$cg.Clear((C 'F2F0EE'))
$mask = New-Object System.Drawing.Drawing2D.GraphicsPath; $mask.AddEllipse(170, 170, 684, 684)  # zona visible ~66 %
$cg.SetClip($mask); $cg.DrawImage($bg, 0, 0, 1024, 1024); $cg.DrawImage($fg, 0, 0, 1024, 1024); $cg.ResetClip()
$cg.Dispose(); $bg.Dispose(); $fg.Dispose()
$chk.Save((Join-Path $OutDir '..\adaptive-check.png'), [System.Drawing.Imaging.ImageFormat]::Png); $chk.Dispose()
"  ../adaptive-check.png (comprobación)"

# 3) Pantalla de carga: icono con esquinas redondeadas sobre fondo transparente
$c = NewCanvas 1024
$clip = RoundRect 112 112 800 800 200
$c[1].TranslateTransform(0, 0)
$g = $c[1]
# fondo recortado al cuadrado redondeado
$state = $g.Save()
$g.SetClip($clip)
$g.TranslateTransform(112, 112)
$g.ScaleTransform(800/1024, 800/1024)
DrawBackground $g 1024 $null
$g.Restore($state)
DrawSymbol $g 512 524 470
Save $c[0] $c[1] 'splash-icon.png'

# 4) favicon 48 px (desde el icono grande)
$src = [System.Drawing.Image]::FromFile((Join-Path $OutDir 'icon.png'))
$c = NewCanvas 48
$c[1].DrawImage($src, 0, 0, 48, 48)
$src.Dispose()
Save $c[0] $c[1] 'favicon.png'

# 5) Vista previa de cómo se ve en el móvil (no se usa en la app)
$prev = New-Object System.Drawing.Bitmap 1200, 520
$g = [System.Drawing.Graphics]::FromImage($prev)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear((C 'F2F0EE'))
$icon = [System.Drawing.Image]::FromFile((Join-Path $OutDir 'icon.png'))
$font = New-Object System.Drawing.Font 'Segoe UI Semibold', 20
$txt = New-Object System.Drawing.SolidBrush (C '151413')
$muted = New-Object System.Drawing.SolidBrush (C '77716C')
$titleFont = New-Object System.Drawing.Font 'Segoe UI', 13
# iOS (esquinas redondeadas)
$g.SetClip((RoundRect 80 80 300 300 68)); $g.DrawImage($icon, 80, 80, 300, 300); $g.ResetClip()
$g.DrawString('iOS', $titleFont, $muted, 205, 400)
# Android (círculo)
$cp = New-Object System.Drawing.Drawing2D.GraphicsPath; $cp.AddEllipse(450, 80, 300, 300)
$g.SetClip($cp); $g.DrawImage($icon, 450, 80, 300, 300); $g.ResetClip()
$g.DrawString('Android', $titleFont, $muted, 555, 400)
# Pequeño, como en el cajón de apps
$cp2 = New-Object System.Drawing.Drawing2D.GraphicsPath; $cp2.AddEllipse(880, 170, 120, 120)
$g.SetClip($cp2); $g.DrawImage($icon, 880, 170, 120, 120); $g.ResetClip()
$g.DrawString('Clarify', $font, $txt, 885, 300)
$icon.Dispose(); $g.Dispose()
$prev.Save((Join-Path $OutDir '..\icon-preview.png'), [System.Drawing.Imaging.ImageFormat]::Png); $prev.Dispose()
"  ../icon-preview.png (vista previa)"
