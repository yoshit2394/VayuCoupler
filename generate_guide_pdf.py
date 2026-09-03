"""
Generates an official styled PDF: VayuCoupler App Download & Installation Guide.
For Smart India Hackathon 2026 (SIH26082 - MoES).
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def create_pdf(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#0D47A1") # Deep MoES Blue
    c_emerald = colors.HexColor("#10B981") # Natural Emerald
    c_dark = colors.HexColor("#111827")
    c_slate = colors.HexColor("#4B5563")
    c_bg_light = colors.HexColor("#F0FDF4") # Mint light bg
    c_border = colors.HexColor("#D1D5DB")
    c_card_bg = colors.HexColor("#F8FAFC")

    # Typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_primary,
        alignment=1 # Center
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=c_emerald,
        alignment=1
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#6B7280"),
        alignment=1
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_primary,
        spaceBefore=12,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#065F46"), # Deep Sage
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=c_dark
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1E293B"),
        backColor=colors.HexColor("#E2E8F0"),
        borderPadding=4
    )

    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=body_style,
        leftIndent=12,
        bulletIndent=4,
        spaceAfter=3
    )

    story = []

    # --- HEADER BANNER ---
    banner_data = [
        [
            Paragraph("<b>SMART INDIA HACKATHON 2026</b><br/><font size=8 color='#4B5563'>Ministry of Earth Sciences (MoES) | Software Track | Theme: Disaster Management</font>", meta_style)
        ]
    ]
    t_banner = Table(banner_data, colWidths=[530])
    t_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_banner)
    story.append(Spacer(1, 10))

    # --- TITLE ---
    story.append(Paragraph("VayuCoupler App — Download & Setup Guide", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Air Pollution–Weather Coupled Forecasting & Predictive GRAP System (Delhi NCR)", subtitle_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_emerald, spaceBefore=0, spaceAfter=10))

    # --- 1. OVERVIEW & INNOVATION ---
    story.append(Paragraph("1. System Overview & The Core Innovation", h1_style))
    story.append(Paragraph(
        "<b>VayuCoupler</b> is a disaster-management decision support system developed for the Ministry of Earth Sciences. "
        "Unlike standard reactive GRAP (which triggers curbs after smog strikes), VayuCoupler dynamically couples "
        "<b>Planetary Boundary Layer Height (PBLH) compression</b>, <b>Thermal Inversion (ΔT) trapping</b>, and "
        "<b>NASA FIRMS satellite stubble fires</b> to forecast severe AQI spikes <b>24 to 72 hours in advance</b>.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # --- 2. HOW TO RUN ON LAPTOP / PC ---
    story.append(Paragraph("2. Quick Start: Running on Laptop / Desktop (Mac / Windows / Linux)", h1_style))
    story.append(Paragraph("Follow these 2 simple steps to launch the complete Command Center & API:", body_style))
    story.append(Spacer(1, 4))

    step1_data = [
        [
            Paragraph("<b>Step 1: Open Terminal / Command Prompt</b><br/>Navigate to the project folder on your computer:", body_style),
        ],
        [
            Paragraph("cd sih-coupled-aqi-delhi", code_style)
        ],
        [
            Paragraph("<b>Step 2: Run the One-Click Startup Script</b><br/>This automatically initializes the environment and launches the server:", body_style),
        ],
        [
            Paragraph("./run.sh &nbsp;&nbsp;&nbsp;&nbsp;<i>(or 'python3 run.py' on Windows)</i>", code_style)
        ],
        [
            Paragraph("<b>Step 3: Open in Browser</b><br/>Go to 👉 <b><u>http://127.0.0.1:8000</u></b> in Chrome, Safari, or Edge.", body_style)
        ]
    ]
    t_steps = Table(step1_data, colWidths=[530])
    t_steps.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_card_bg),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_steps)
    story.append(Spacer(1, 10))

    # --- 3. HOW TO INSTALL AS MOBILE APP ---
    story.append(Paragraph("3. How to Install as Mobile App on iPhone & Android", h1_style))
    story.append(Paragraph("The application has a mobile-optimized PWA layout with touch scrubber and bottom navigation bar:", body_style))
    story.append(Spacer(1, 5))

    mob_data = [
        [
            Paragraph("<b>📱 For Apple iPhone / iPad (iOS)</b>", h2_style),
            Paragraph("<b>🤖 For Android Phones (Google Chrome)</b>", h2_style)
        ],
        [
            Paragraph(
                "1. Connect your iPhone to the same Wi-Fi as your laptop.<br/>"
                "2. Open <b>Safari</b> and enter: <code>http://&lt;your-laptop-ip&gt;:8000</code><br/>"
                "3. Tap the <b>Share Button</b> (square with arrow up) at the bottom.<br/>"
                "4. Scroll down and tap <b>'Add to Home Screen'</b> (➕).<br/>"
                "5. Tap <b>'Add'</b> in the top-right corner.<br/>"
                "<i>Now the app opens full-screen like a native iOS app!</i>",
                bullet_style
            ),
            Paragraph(
                "1. Connect your Android phone to the same Wi-Fi.<br/>"
                "2. Open <b>Chrome</b> and visit: <code>http://&lt;your-laptop-ip&gt;:8000</code><br/>"
                "3. Tap the <b>Three-Dot Menu (⋮)</b> in top-right.<br/>"
                "4. Tap <b>'Install app'</b> or <b>'Add to Home screen'</b>.<br/>"
                "5. Tap <b>'Install'</b> on the confirmation popup.<br/>"
                "<i>The VayuCoupler app icon will appear on your home launcher!</i>",
                bullet_style
            )
        ]
    ]
    t_mob = Table(mob_data, colWidths=[260, 260])
    t_mob.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_card_bg),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_mob)
    story.append(Spacer(1, 10))

    # --- 4. KEY APP FEATURES CHEAT SHEET ---
    story.append(Paragraph("4. Key App Features & Navigation Guide", h1_style))
    
    features_table_data = [
        [Paragraph("<b>Tab / Feature</b>", body_bold), Paragraph("<b>What it Does & Key Talking Point for Judges</b>", body_bold)],
        [
            Paragraph("<b>Command Center</b>", body_style),
            Paragraph("Real-time Delhi NCR map with 16 stations, animated wind particle vector field, upwind stubble fire clusters, and 72-hour forecast confidence curves.", body_style)
        ],
        [
            Paragraph("<b>Predictive GRAP</b>", body_style),
            Paragraph("Evaluates 9 configurable rules; shows exact lead-time gained (+72h, +48h, +36h, +24h) compared to reactive GRAP.", body_style)
        ],
        [
            Paragraph("<b>VayuAI Copilot</b>", body_style),
            Paragraph("Conversational GenAI decision assistant answering questions on stubble trajectories, traffic police orders, and asthma health risks.", body_style)
        ],
        [
            Paragraph("<b>Clean Air Windows</b>", body_style),
            Paragraph("24-hour diurnal outdoor planner identifying safe clean windows (1 PM–4 PM) vs dangerous nocturnal inversion trapping (6 AM–9:30 AM).", body_style)
        ],
        [
            Paragraph("<b>Atmospheric 3D</b>", body_style),
            Paragraph("Graphic atmospheric cross-section showing boundary layer collapse (1400m to 240m) and thermal inversion capping.", body_style)
        ],
        [
            Paragraph("<b>Report Fire (AI)</b>", body_style),
            Paragraph("Citizen crowdsourcing tool with mock Vision AI (94% confidence) to geotag farm fires and auto-dispatch municipal patrol teams.", body_style)
        ],
        [
            Paragraph("<b>What-If Simulator</b>", body_style),
            Paragraph("Interactive sliders to test policy interventions (50% stubble reduction, 40% truck bypass) showing instant avoided AQI points.", body_style)
        ],
    ]
    t_feat = Table(features_table_data, colWidths=[130, 390])
    t_feat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_feat)
    story.append(Spacer(1, 10))

    # --- 5. HACKATHON PITCH SCRIPT ---
    story.append(Paragraph("5. 30-Second Winning Pitch Script for Hackathon", h1_style))
    pitch_box = [
        [
            Paragraph(
                "<i>\"Respected Judges, Delhi's current GRAP is reactive — curbs are imposed only after severe smog is confirmed. "
                "<b>VayuCoupler</b> couples dynamic atmospheric physics (boundary layer collapse, thermal inversion) with satellite fire counts "
                "to predict spikes <b>48 to 72 hours in advance</b>. This buys 2 to 3 days of lead time for Punjab agriculture departments to accelerate bio-decomposer spraying, "
                "traffic police to divert 60,000+ diesel trucks to bypass expressways, and schools to transition online without morning panic.\"</i>",
                body_style
            )
        ]
    ]
    t_pitch = Table(pitch_box, colWidths=[530])
    t_pitch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
        ('BOX', (0,0), (-1,-1), 1.5, c_emerald),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_pitch)
    story.append(Spacer(1, 10))

    # --- FOOTER METADATA ---
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=6, spaceAfter=6))
    story.append(Paragraph(
        "<b>Ministry of Earth Sciences (MoES) — SIH 2026</b> &bull; Air Pollution–Weather Coupled Forecasting System &bull; Project ID: SIH26082",
        meta_style
    ))

    doc.build(story)
    print(f"✅ PDF generated successfully at: {output_path}")

if __name__ == "__main__":
    pdf_dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs", "VayuCoupler_App_Download_Guide.pdf")
    create_pdf(pdf_dest)
    
    # Also copy to static folder so users can download it directly from the web app
    static_dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "app", "static", "VayuCoupler_App_Download_Guide.pdf")
    create_pdf(static_dest)
