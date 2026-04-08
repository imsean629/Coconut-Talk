Add-Type -AssemblyName System.Drawing
$size = 512
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

$ringBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f1dcc6'))
$leafDarkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#5f9d3f'))
$faceBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#fff6ea'))
$eyeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#3c271d'))
$blushBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(170,246,180,172))

$leafGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  ([System.Drawing.Point]::new(128, 44)),
  ([System.Drawing.Point]::new(384, 180)),
  ([System.Drawing.ColorTranslator]::FromHtml('#9bd06f')),
  ([System.Drawing.ColorTranslator]::FromHtml('#6ea84c'))
)

$shellGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  ([System.Drawing.Point]::new(110, 140)),
  ([System.Drawing.Point]::new(420, 430)),
  ([System.Drawing.ColorTranslator]::FromHtml('#6b4b39')),
  ([System.Drawing.ColorTranslator]::FromHtml('#7c5743'))
)

$g.FillEllipse($ringBrush, 58, 58, 396, 396)

$bodyPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$bodyPath.AddArc(88, 88, 336, 336, 180, 180)
$bodyPath.AddArc(88, 112, 336, 312, 0, 180)
$bodyPath.CloseFigure()
$g.FillPath($shellGradient, $bodyPath)

$topLeaf = New-Object System.Drawing.Drawing2D.GraphicsPath
$topLeaf.AddBezier(
  ([System.Drawing.Point]::new(160, 140)),
  ([System.Drawing.Point]::new(176, 62)),
  ([System.Drawing.Point]::new(336, 62)),
  ([System.Drawing.Point]::new(352, 140))
)
$topLeaf.AddLine(352, 140, 160, 140)
$topLeaf.CloseFigure()
$g.FillPath($leafGradient, $topLeaf)

$leftLeaf = New-Object System.Drawing.Drawing2D.GraphicsPath
$leftLeaf.AddEllipse(160, 34, 76, 136)
$leftMatrix = New-Object System.Drawing.Drawing2D.Matrix
$leftMatrix.RotateAt(-18, ([System.Drawing.PointF]::new(198, 102)))
$leftLeaf.Transform($leftMatrix)
$g.FillPath($leafDarkBrush, $leftLeaf)

$rightLeaf = New-Object System.Drawing.Drawing2D.GraphicsPath
$rightLeaf.AddEllipse(274, 34, 76, 136)
$rightMatrix = New-Object System.Drawing.Drawing2D.Matrix
$rightMatrix.RotateAt(18, ([System.Drawing.PointF]::new(312, 102)))
$rightLeaf.Transform($rightMatrix)
$g.FillPath($leafDarkBrush, $rightLeaf)

$g.FillEllipse($faceBrush, 152, 172, 92, 92)
$g.FillEllipse($faceBrush, 268, 172, 92, 92)
$g.FillEllipse($eyeBrush, 184, 203, 34, 34)
$g.FillEllipse($eyeBrush, 300, 203, 34, 34)

$mouthPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#3c271d'), 8)
$mouthPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$mouthPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawArc($mouthPen, 205, 286, 102, 54, 18, 144)

$g.FillEllipse($blushBrush, 116, 270, 60, 36)
$g.FillEllipse($blushBrush, 336, 270, 60, 36)

$bmp.Save('C:\Coding Works\Coconnut Talk\build\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)

$mouthPen.Dispose()
$bodyPath.Dispose()
$topLeaf.Dispose()
$leftLeaf.Dispose()
$rightLeaf.Dispose()
$leftMatrix.Dispose()
$rightMatrix.Dispose()
$leafGradient.Dispose()
$shellGradient.Dispose()
$ringBrush.Dispose()
$leafDarkBrush.Dispose()
$faceBrush.Dispose()
$eyeBrush.Dispose()
$blushBrush.Dispose()
$g.Dispose()
$bmp.Dispose()
