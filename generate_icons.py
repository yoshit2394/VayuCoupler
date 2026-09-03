"""
Generate ultra-premium, high-resolution app icons for VayuCoupler (MoES Air Pollution & Weather Coupled System).
"""

import math
from PIL import Image, ImageDraw, ImageFilter

def create_premium_icon(size):
    # Render at 4x for super-sampled ultra smooth anti-aliasing
    scale = 4
    canvas_size = size * scale
    
    img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Base Squircle / Rounded Shape with Deep Atmospheric Gradient
    # Center and radii
    cx, cy = canvas_size / 2, canvas_size / 2
    r_outer = canvas_size * 0.44
    
    # Draw radial gradient background
    bg_layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_layer)
    
    # Draw rounded rect mask
    corner_radius = int(canvas_size * 0.22)
    bg_draw.rounded_rectangle(
        [canvas_size * 0.04, canvas_size * 0.04, canvas_size * 0.96, canvas_size * 0.96],
        radius=corner_radius,
        fill=(10, 25, 22, 255)
    )
    
    # Gradient overlay
    for i in range(int(canvas_size * 0.92)):
        prog = i / (canvas_size * 0.92)
        # Deep emerald (#042018) to vibrant teal/cyan (#064E3B) to deep space slate (#02110D)
        r = int(3 + 8 * (1 - prog) + 4 * math.sin(prog * 3.14))
        g = int(22 + 55 * math.sin(prog * 3.14) + 20 * prog)
        b = int(18 + 40 * math.sin(prog * 3.14) + 15 * (1 - prog))
        y = int(canvas_size * 0.04 + i)
        # Draw line if inside
        # We'll composite with mask
    
    # Let's create a rich radial/conical atmospheric glow
    glow_layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    
    # Center atmospheric rings
    for rad in range(int(canvas_size * 0.45), 0, -8):
        factor = rad / (canvas_size * 0.45)
        alpha = int(160 * (1 - factor))
        # Cyan-Emerald glow
        g_val = int(180 * (1 - factor * 0.5))
        b_val = int(220 * (1 - factor * 0.3))
        glow_draw.ellipse(
            [cx - rad, cy - rad + canvas_size * 0.05, cx + rad, cy + rad + canvas_size * 0.05],
            fill=(10, g_val, b_val, alpha)
        )
    
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=int(scale * 12)))
    
    # Composite background
    final_bg = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    # Fill rounded base
    base_draw = ImageDraw.Draw(final_bg)
    base_draw.rounded_rectangle(
        [canvas_size * 0.04, canvas_size * 0.04, canvas_size * 0.96, canvas_size * 0.96],
        radius=corner_radius,
        fill=(6, 26, 22, 255),
        outline=(52, 211, 153, 200),
        width=int(scale * 3)
    )
    final_bg = Image.alpha_composite(final_bg, glow_layer)
    
    # Clip by mask
    mask = Image.new('L', (canvas_size, canvas_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [canvas_size * 0.04, canvas_size * 0.04, canvas_size * 0.96, canvas_size * 0.96],
        radius=corner_radius,
        fill=255
    )
    
    # 2. Draw Dynamic Atmospheric Flow Waves & Leaf/Vortex Emblem
    emblem_layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    e_draw = ImageDraw.Draw(emblem_layer)
    
    # Wind Streamline 1 (Cyan to Emerald wave)
    points_wave1 = []
    points_wave2 = []
    points_wave3 = []
    
    num_steps = 100
    for s in range(num_steps):
        t = s / num_steps
        # S-curve wind vector
        x = canvas_size * (0.22 + 0.56 * t)
        y1 = cy + canvas_size * 0.18 * math.sin((t - 0.2) * 4.2) - (1 - t) * canvas_size * 0.08
        y2 = cy + canvas_size * 0.22 * math.sin((t - 0.1) * 4.0) + canvas_size * 0.06
        y3 = cy + canvas_size * 0.14 * math.sin((t - 0.3) * 4.5) - canvas_size * 0.16
        points_wave1.append((x, y1))
        points_wave2.append((x, y2))
        points_wave3.append((x, y3))
        
    # Draw glowing streamlines
    for i in range(len(points_wave1) - 1):
        prog = i / len(points_wave1)
        w = int(scale * (6 + 6 * math.sin(prog * 3.14)))
        # Emerald to Sky Cyan gradient
        r = int(16 + 30 * prog)
        g = int(185 + 40 * math.sin(prog * 3.14))
        b = int(129 + 115 * prog)
        e_draw.line([points_wave1[i], points_wave1[i+1]], fill=(r, g, b, 240), width=w)

    for i in range(len(points_wave2) - 1):
        prog = i / len(points_wave2)
        w = int(scale * (4 + 5 * math.sin(prog * 3.14)))
        e_draw.line([points_wave2[i], points_wave2[i+1]], fill=(56, 189, 248, 220), width=w)

    for i in range(len(points_wave3) - 1):
        prog = i / len(points_wave3)
        w = int(scale * (3 + 4 * math.sin(prog * 3.14)))
        e_draw.line([points_wave3[i], points_wave3[i+1]], fill=(245, 158, 11, 200), width=w)

    # 3. Draw Center Iconic "V" Vortex Shield / Air Purity Crest
    # 3D Glass Shield with pure emerald & cyan bevels
    shield_pts = [
        (cx - canvas_size * 0.26, cy - canvas_size * 0.22),
        (cx + canvas_size * 0.26, cy - canvas_size * 0.22),
        (cx + canvas_size * 0.20, cy + canvas_size * 0.12),
        (cx, cy + canvas_size * 0.32),
        (cx - canvas_size * 0.20, cy + canvas_size * 0.12)
    ]
    # Soft shield shadow
    e_draw.polygon(shield_pts, fill=(8, 38, 30, 180), outline=(52, 211, 153, 255))
    
    # Inner "V" Wing / Bird of Clean Air (Purity Wings)
    # Wing Left
    wing_left = [
        (cx - canvas_size * 0.20, cy - canvas_size * 0.16),
        (cx - canvas_size * 0.04, cy + canvas_size * 0.14),
        (cx - canvas_size * 0.12, cy + canvas_size * 0.14),
        (cx - canvas_size * 0.24, cy - canvas_size * 0.08)
    ]
    e_draw.polygon(wing_left, fill=(255, 255, 255, 250))

    # Wing Right (Emerald Gradient)
    wing_right = [
        (cx + canvas_size * 0.20, cy - canvas_size * 0.16),
        (cx + canvas_size * 0.04, cy + canvas_size * 0.14),
        (cx + canvas_size * 0.12, cy + canvas_size * 0.14),
        (cx + canvas_size * 0.24, cy - canvas_size * 0.08)
    ]
    e_draw.polygon(wing_right, fill=(52, 211, 153, 250))

    # Center Pure Core Sparkle / Sun of Hope
    sun_r = int(canvas_size * 0.065)
    e_draw.ellipse(
        [cx - sun_r, cy - canvas_size * 0.14 - sun_r, cx + sun_r, cy - canvas_size * 0.14 + sun_r],
        fill=(250, 204, 21, 255),
        outline=(255, 255, 255, 240),
        width=int(scale * 2)
    )

    # Combine
    final = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    final.paste(final_bg, (0, 0), mask=mask)
    final.paste(emblem_layer, (0, 0), mask=mask)

    # Specular Glass Highlight at Top-Left
    spec_layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    spec_draw = ImageDraw.Draw(spec_layer)
    spec_draw.ellipse(
        [canvas_size * 0.08, canvas_size * 0.06, canvas_size * 0.92, canvas_size * 0.44],
        fill=(255, 255, 255, 30)
    )
    spec_layer = spec_layer.filter(ImageFilter.GaussianBlur(radius=int(scale * 16)))
    final.paste(spec_layer, (0, 0), mask=mask)

    # Downsample with Lanczos for crisp, high-DPI retina sharpness
    return final.resize((size, size), Image.Resampling.LANCZOS)

if __name__ == "__main__":
    icon_192 = create_premium_icon(192)
    icon_192.save("/Users/vivekraj/.gemini/antigravity-ide/scratch/sih-coupled-aqi-delhi/backend/app/static/icon-192.png", "PNG")
    
    icon_512 = create_premium_icon(512)
    icon_512.save("/Users/vivekraj/.gemini/antigravity-ide/scratch/sih-coupled-aqi-delhi/backend/app/static/icon-512.png", "PNG")
    
    icon_apple = create_premium_icon(180)
    icon_apple.save("/Users/vivekraj/.gemini/antigravity-ide/scratch/sih-coupled-aqi-delhi/backend/app/static/apple-touch-icon.png", "PNG")
    
    print("✅ High-Resolution Premium Icons Generated Successfully!")
