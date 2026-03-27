from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER


def generate_session_pdf(patient: dict, session: dict, report_content: str) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
    )
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        alignment=TA_CENTER,
        fontSize=18,
        spaceAfter=20,
    )
    story.append(Paragraph("Clinical Body Assessment Report", title_style))
    story.append(Spacer(1, 0.2 * inch))

    # Patient Info Table
    story.append(Paragraph("Patient Information", styles["Heading2"]))
    patient_data = [
        ["Name", patient.get("name", "N/A")],
        ["Age", str(patient.get("age", "N/A"))],
        ["Gender", patient.get("gender", "N/A")],
        ["Height (cm)", str(patient.get("height_cm", "N/A"))],
        ["Weight (kg)", str(patient.get("weight_kg", "N/A"))],
        ["Session Date", str(session.get("session_date", "N/A"))],
    ]
    patient_table = Table(patient_data, colWidths=[2 * inch, 4 * inch])
    patient_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.lightblue),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.whitesmoke, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 0.3 * inch))

    # Measurements Table
    measurements = session.get("measurements", {})
    if measurements:
        story.append(Paragraph("Body Measurements", styles["Heading2"]))
        meas_data = [["Measurement", "Value"]]
        for key, val in measurements.items():
            label = key.replace("_", " ").title()
            meas_data.append([label, str(val)])
        meas_table = Table(meas_data, colWidths=[3 * inch, 3 * inch])
        meas_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.steelblue),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(meas_table)
        story.append(Spacer(1, 0.3 * inch))

    # Clinical Assessment
    if report_content:
        story.append(Paragraph("Clinical Assessment", styles["Heading2"]))
        for line in report_content.split("\n"):
            if line.strip():
                story.append(Paragraph(line, styles["Normal"]))
                story.append(Spacer(1, 0.05 * inch))
        story.append(Spacer(1, 0.2 * inch))

    # Disclaimer Footer
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.grey,
        borderPad=6,
    )
    story.append(Paragraph(
        "DISCLAIMER: This report is AI-generated and for informational purposes only. "
        "It does not constitute medical advice. Consult a qualified healthcare professional.",
        disclaimer_style,
    ))

    doc.build(story)
    return buffer.getvalue()
