"""
AquaPredict AI - PDF Report Generator Service
Generates official-grade CWC / Ministry of Jal Shakti style decision support PDF reports.
"""

import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

def generate_pdf_report(
    reservoir_data: dict,
    forecast_data: dict,
    scenario_name: str = "Normal Conditions",
    notes: str = ""
) -> str:
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    res_name = reservoir_data.get("name", "Reservoir").replace(" ", "_")
    filename = f"AquaPredict_Report_{res_name}_{timestamp_str}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a')
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0284c7')
    )
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#334155')
    )
    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1e293b'),
        leftIndent=15
    )

    elements = []

    # Header / Title Block
    elements.append(Paragraph("AQUAPREDICT AI — WATER RESOURCE ASSESSMENT", title_style))
    elements.append(Paragraph("SIH1692: Central Water Commission / Ministry of Jal Shakti Decision Support Platform", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0284c7"), spaceAfter=15, spaceBefore=8))

    # Meta Table
    gen_time = datetime.now().strftime("%d %B %Y, %H:%M:%S UTC")
    meta_data = [
        [
            Paragraph("<b>Target Reservoir:</b> " + str(reservoir_data.get("name", "N/A")), body_style),
            Paragraph("<b>State / District:</b> " + f"{reservoir_data.get('state', 'N/A')} / {reservoir_data.get('district', 'N/A')}", body_style)
        ],
        [
            Paragraph("<b>Generated On:</b> " + gen_time, body_style),
            Paragraph("<b>Simulation Scenario:</b> " + scenario_name, body_style)
        ],
        [
            Paragraph("<b>Storage Capacity:</b> " + f"{reservoir_data.get('capacity_mcm', 'N/A')} MCM", body_style),
            Paragraph("<b>Current Storage:</b> " + f"{reservoir_data.get('current_storage_mcm', 'N/A')} MCM ({round((reservoir_data.get('current_storage_mcm', 0) / max(1, reservoir_data.get('capacity_mcm', 1))) * 100, 1)}%)", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[260, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 12))

    # Executive Summary
    elements.append(Paragraph("1. Executive Summary & Storage Outlook", section_style))
    end_pct = forecast_data.get("end_storage_percentage", 50.0)
    risk_lvl = forecast_data.get("overall_risk_level", "MEDIUM")
    risk_score = forecast_data.get("overall_risk_score", 45.0)

    summary_text = (
        f"Based on gradient boosting ensemble models evaluated using chronological validation, "
        f"the projected 12-month average water demand for {reservoir_data.get('name')} is estimated at "
        f"<b>{forecast_data.get('average_predicted_demand_mcm', 'N/A')} MCM</b>. "
        f"Under {scenario_name} conditions, the projected storage at the horizon is "
        f"<b>{forecast_data.get('end_storage_mcm', 'N/A')} MCM ({end_pct}%)</b>. "
        f"The composite 7-factor water stress risk is evaluated at <b>{risk_score}/100 ({risk_lvl})</b>."
    )
    elements.append(Paragraph(summary_text, body_style))
    elements.append(Spacer(1, 8))

    # Risk & Storage Metrics Table
    elements.append(Paragraph("2. Water Balance & Decision Support Metrics", section_style))
    metrics_data = [
        ["Key Metric", "Baseline Measurement", "Projected Horizon Value", "Risk Implication"],
        ["Water Demand (Monthly Avg)", f"{reservoir_data.get('current_demand_mcm', 420.0)} MCM", f"{forecast_data.get('average_predicted_demand_mcm', 'N/A')} MCM", "Seasonal Peak in Summer/Rabi"],
        ["Reservoir Storage", f"{reservoir_data.get('current_storage_mcm', 'N/A')} MCM", f"{forecast_data.get('end_storage_mcm', 'N/A')} MCM", f"{end_pct}% Capacity Utilization"],
        ["Inflow Volume (Est.)", "Historical Baseline", f"{round(forecast_data.get('average_predicted_demand_mcm', 400.0) * 0.85, 1)} MCM", "Rainfall-dependent replenishment"],
        ["Risk Assessment", f"{reservoir_data.get('risk_level', 'MEDIUM')}", f"{risk_lvl} ({risk_score}/100)", f"Peak Stress: {forecast_data.get('peak_risk_month', 'Month +6')}"]
    ]
    t_metrics = Table(metrics_data, colWidths=[150, 120, 120, 140])
    t_metrics.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BACKGROUND', (0,1), (-1,-1), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(t_metrics)
    elements.append(Spacer(1, 10))

    # Recommendations
    elements.append(Paragraph("3. Actionable Water-Resource Engineering Directives", section_style))
    recs = forecast_data.get("recommendations", [])
    if not recs:
        recs = [
            "Maintain standard conservation releases and incentivize micro-irrigation systems.",
            "Enforce municipal demand curtailment if summer drawdown exceeds 5% per week.",
            "Coordinate with state irrigation boards for rotational distribution (Warabandi system)."
        ]
    for idx, r in enumerate(recs, 1):
        elements.append(Paragraph(f"• <b>Directive {idx}:</b> {r}", bullet_style))
        elements.append(Spacer(1, 4))

    # Notes
    if notes:
        elements.append(Paragraph("4. Planners Notes & Operational Constraints", section_style))
        elements.append(Paragraph(notes, body_style))
        elements.append(Spacer(1, 8))

    # Footer notice
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=6, spaceBefore=4))
    disclaimer = (
        "<b>DATA NOTICE:</b> This evaluation report incorporates synthetic/demo water records generated for the "
        "Smart India Hackathon (SIH1692) prototype evaluation. Results demonstrate algorithmic model capabilities "
        "and decision support workflows for the Ministry of Jal Shakti / CWC framework."
    )
    elements.append(Paragraph(disclaimer, ParagraphStyle('Disc', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=7.5, leading=10, textColor=colors.HexColor('#64748b'))))

    doc.build(elements)
    return filename
