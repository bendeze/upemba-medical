from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Sum, F
from django.utils import timezone
from datetime import timedelta
from beneficiaries.models import Employee, Dependent
from consultations.models import Consultation
from pharmacy.models import Medicine, StockMovement, PharmacyStock, MedicalCenter, MedicineBatch
import datetime
from collections import defaultdict
from django.http import HttpResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from io import BytesIO

class DashboardOverviewAPIView(APIView):
    def get(self, request):
        today = timezone.localdate()
        thirty_days_ago = today - timedelta(days=30)

        total_employees = Employee.objects.filter(is_deleted=False).count()
        total_dependents = Dependent.objects.count()

        # Consultations KPI
        total_consultations = Consultation.objects.filter(date__gte=thirty_days_ago).count()
        
        # Medical Centers
        active_centers = MedicalCenter.objects.count()

        return Response({
            'total_employees': total_employees,
            'total_dependents': total_dependents,
            'total_consultations_30d': total_consultations,
            'active_centers': active_centers
        })

class PharmacyReportsAPIView(APIView):
    def get(self, request):
        today = timezone.localdate()
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if start_date_str:
            try:
                start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                start_date = today - timedelta(days=30)
        else:
            start_date = today - timedelta(days=30)

        if end_date_str:
            try:
                end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                end_date = today
        else:
            end_date = today

        # 1. Low Stock Alerts (Current snapshot, unaffected by date filters)
        stocks = PharmacyStock.objects.select_related('medicine', 'medical_center').all()
        low_stock = []
        current_stock_total = 0
        for s in stocks:
            current_stock_total += s.quantity
            limit = s.medicine.min_stock_level if s.medicine.min_stock_level is not None else 10
            if s.quantity <= limit:
                low_stock.append({
                    'id': str(s.id),
                    'medicine_name': s.medicine.name,
                    'center_name': s.medical_center.name if s.medical_center else 'Main',
                    'current_quantity': s.quantity,
                    'minimum_required': limit
                })
        
        # 2. Expiring Batches (Current snapshot + 90 days threshold)

        ninety_days_from_now = today + timedelta(days=90)
        expiring_batches_qs = MedicineBatch.objects.filter(
            quantity__gt=0,
            expiration_date__lte=ninety_days_from_now
        ).select_related('medicine', 'medical_center')
        
        expiring_batches = []
        for b in expiring_batches_qs:
            expiring_batches.append({
                'id': str(b.id),
                'medicine_name': b.medicine.name,
                'lot_number': b.lot_number,
                'center_name': b.medical_center.name if b.medical_center else 'Main',
                'quantity': b.quantity,
                'expiration_date': b.expiration_date.strftime('%Y-%m-%d') if b.expiration_date else None,
            })

        # Base Movement Query for the date range
        movements_qs = StockMovement.objects.filter(date__gte=start_date, date__lte=end_date)

        # 3. Top dispensed medicines (within date range)
        dispensed_movements = movements_qs.filter(
            movement_type__in=['DISPENSE', 'OUT']
        ).values('medicine__name').annotate(
            total_quantity=Sum('quantity')
        ).order_by('-total_quantity')[:10]

        # 4. Stock Movements summary (In vs Out within date range)
        stock_in = movements_qs.filter(movement_type='IN').aggregate(total=Sum('quantity'))['total'] or 0
        stock_out = movements_qs.filter(movement_type__in=['OUT', 'DISPENSE']).aggregate(total=Sum('quantity'))['total'] or 0

        # 5. Movements over time (Daily IN vs OUT)

        
        daily_flow = defaultdict(lambda: {'in': 0, 'out': 0})
        for m in movements_qs.values('date', 'movement_type', 'quantity'):
            date_key = m['date'].strftime('%Y-%m-%d') if not isinstance(m['date'], str) else m['date']
            if m['movement_type'] == 'IN':
                daily_flow[date_key]['in'] += m['quantity']
            elif m['movement_type'] in ['OUT', 'DISPENSE']:
                daily_flow[date_key]['out'] += m['quantity']
                
        flow_list = [{'date': k, 'in': v['in'], 'out': v['out']} for k, v in daily_flow.items()]
        flow_list.sort(key=lambda x: x['date'])

        return Response({
            'current_stock_total': current_stock_total,
            'low_stock_alerts': low_stock,
            'expiring_batches': expiring_batches,
            'top_dispensed': list(dispensed_movements),
            'movements_summary': {
                'in': stock_in,
                'out': stock_out
            },
            'daily_flow': flow_list
        })

class ConsultationReportsAPIView(APIView):
    def get(self, request):
        # Patient Types Breakdown
        patient_types = Consultation.objects.values('patient_type').annotate(count=Count('id'))
        
        # Consultations over the last 6 months (group by month)
        # Using simple python grouping for SQLite compatibility instead of TruncMonth

        
        today = timezone.localdate()
        six_months_ago = today - timedelta(days=180)
        
        consults = Consultation.objects.filter(date__gte=six_months_ago).values('date', 'id')
        monthly_trends = defaultdict(int)
        
        for c in consults:
            # e.g. "2026-07"
            if isinstance(c['date'], str):
                date_obj = datetime.datetime.strptime(c['date'], '%Y-%m-%d').date()
                month_key = date_obj.strftime('%Y-%m')
            else:
                month_key = c['date'].strftime('%Y-%m')
            monthly_trends[month_key] += 1
            
        trends_list = [{'month': k, 'count': v} for k, v in monthly_trends.items()]
        trends_list.sort(key=lambda x: x['month'])

        return Response({
            'patient_types': list(patient_types),
            'monthly_trends': trends_list
        })



def generate_pdf(export_type, start_date_str, end_date_str, data):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom Styles
    header_style = ParagraphStyle(
        name='HeaderStyle',
        parent=styles['Normal'],
        alignment=1, # Center
        fontName='Helvetica-Bold',
        fontSize=10,
        spaceAfter=2,
        textColor=colors.HexColor('#1f2937')
    )
    
    title_style = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Heading1'],
        alignment=1, # Center
        fontName='Helvetica-Bold',
        fontSize=16,
        spaceBefore=20,
        spaceAfter=15,
        textColor=colors.HexColor('#111827')
    )
    
    meta_style = ParagraphStyle(
        name='MetaStyle',
        parent=styles['Normal'],
        alignment=0, # Left
        fontName='Helvetica',
        fontSize=10,
        spaceAfter=20,
        textColor=colors.HexColor('#4b5563')
    )
    
    normal_style = styles['Normal']
    
    # Official Header
    elements.append(Paragraph("RÉPUBLIQUE DÉMOCRATIQUE DU CONGO", header_style))
    elements.append(Paragraph("MINISTÈRE DE LA SANTÉ PUBLIQUE", header_style))
    elements.append(Paragraph("INSTITUT CONGOLAIS POUR LA CONSERVATION DE LA NATURE", header_style))
    elements.append(Paragraph("PARC NATIONAL DE L'UPEMBA", header_style))
    elements.append(Paragraph("CENTRE MÉDICAL", header_style))
    
    # Divider line
    line_data = [['']]
    line_table = Table(line_data, colWidths=[doc.width])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor('#1f2937')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10)
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 10))
    
    # Report Title
    report_title = f"RAPPORT: {export_type.replace('_', ' ').upper()}"
    elements.append(Paragraph(report_title, title_style))
    
    # Report Metadata

    generation_date = datetime.date.today().strftime('%Y-%m-%d')
    meta_text = f"<b>Période couverte :</b> {start_date_str} au {end_date_str}<br/><b>Date d'émission :</b> {generation_date}"
    elements.append(Paragraph(meta_text, meta_style))
    
    if data:
        # Table configuration
        headers = list(data[0].keys())
        table_data = [headers]
        
        for row in data:
            table_data.append([str(row[k]) for k in headers])
            
        # Distribute columns evenly
        col_width = doc.width / len(headers)
        t = Table(table_data, colWidths=[col_width]*len(headers), repeatRows=1)
        
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#1f2937')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("Aucune donnée disponible pour cette période.", normal_style))
        
    # Signature Block
    elements.append(Spacer(1, 40))
    sig_data = [
        [Paragraph("<b>Infirmière en Chef</b>", ParagraphStyle(name='s1', alignment=2, fontName='Helvetica'))]
    ]
    sig_table = Table(sig_data, colWidths=[doc.width])
    sig_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'RIGHT')]))
    elements.append(sig_table)
    
    elements.append(Spacer(1, 40))
    
    name_data = [
        [Paragraph("<b>Anne-marie Ndeze</b>", ParagraphStyle(name='s2', alignment=2, fontName='Helvetica'))]
    ]
    name_table = Table(name_data, colWidths=[doc.width])
    name_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'RIGHT')]))
    elements.append(name_table)
    
    # Page Numbering & Footer
    def add_page_number(canvas, doc):
        page_num = canvas.getPageNumber()
        text = f"Page {page_num}"
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#6b7280'))
        canvas.drawRightString(doc.pagesize[0] - 40, 20, text)
        canvas.drawString(40, 20, "Parc National de l'Upemba - Système de Gestion Médicale")

    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

class ExportReportAPIView(APIView):
    def get(self, request):
        today = timezone.localdate()
        export_type = request.query_params.get('type')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if start_date_str:
            try:
                start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                start_date = today - timedelta(days=30)
        else:
            start_date = today - timedelta(days=30)

        if end_date_str:
            try:
                end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                end_date = today
        else:
            end_date = today

        if export_type == 'DASHBOARD':
            if request.query_params.get('export_format') == 'pdf':
                pdf = generate_dashboard_pdf(start_date_str or start_date.strftime('%Y-%m-%d'), end_date_str or end_date.strftime('%Y-%m-%d'))
                response = HttpResponse(pdf, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="dashboard_report_{start_date.strftime("%Y-%m-%d")}.pdf"'
                return response
            return Response({"error": "Dashboard export is only available in PDF format"}, status=400)

        elif export_type == 'PHARMACY_DASHBOARD':
            if request.query_params.get('export_format') == 'pdf':
                pdf = generate_pharmacy_dashboard_pdf(start_date_str or start_date.strftime('%Y-%m-%d'), end_date_str or end_date.strftime('%Y-%m-%d'))
                response = HttpResponse(pdf, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="pharmacy_dashboard_report_{start_date.strftime("%Y-%m-%d")}.pdf"'
                return response
            return Response({"error": "Pharmacy Dashboard export is only available in PDF format"}, status=400)

        elif export_type == 'STOCK_MOVEMENTS':
            # Detailed stock movements
            movements = StockMovement.objects.filter(
                date__gte=start_date, date__lte=end_date
            ).select_related('medicine', 'medical_center').order_by('-date', '-created_at')
            
            data = []
            for m in movements:
                data.append({
                    'Date': m.date.strftime('%Y-%m-%d'),
                    'Type': m.movement_type,
                    'Medicine': m.medicine.name,
                    'Quantity': m.quantity,
                    'Location': m.medical_center.name if m.medical_center else 'Main',
                    'Notes': m.notes or ''
                })
            
            if request.query_params.get('export_format') == 'pdf':
                pdf = generate_pdf(export_type, start_date_str or start_date.strftime('%Y-%m-%d'), end_date_str or end_date.strftime('%Y-%m-%d'), data)
                response = HttpResponse(pdf, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{export_type.lower()}_report_{start_date.strftime("%Y-%m-%d")}.pdf"'
                return response
            return Response(data)

        elif export_type == 'CONSUMPTION':
            # Consumption summary (dispensed only)
            movements = StockMovement.objects.filter(
                date__gte=start_date, date__lte=end_date, movement_type__in=['DISPENSE', 'OUT']
            ).values('medicine__name').annotate(
                total_dispensed=Sum('quantity')
            ).order_by('-total_dispensed')

            data = []
            for m in movements:
                data.append({
                    'Medicine': m['medicine__name'],
                    'Total Dispensed': m['total_dispensed']
                })
            
            if request.query_params.get('export_format') == 'pdf':
                pdf = generate_pdf(export_type, start_date_str or start_date.strftime('%Y-%m-%d'), end_date_str or end_date.strftime('%Y-%m-%d'), data)
                response = HttpResponse(pdf, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{export_type.lower()}_report_{start_date.strftime("%Y-%m-%d")}.pdf"'
                return response
            return Response(data)

        elif export_type == 'CONSULTATIONS':
            # Consultations details
            consults = Consultation.objects.filter(
                date__gte=start_date, date__lte=end_date
            ).select_related('medical_center', 'employee', 'dependent').order_by('-date', '-created_at')

            data = []
            for c in consults:
                if c.patient_type == 'EMPLOYEE' and c.employee:
                    patient_name = f"{c.employee.nom} {c.employee.prenom}"
                elif c.patient_type == 'DEPENDENT' and c.dependent:
                    patient_name = f"{c.dependent.nom} {c.dependent.prenom}"
                else:
                    patient_name = c.external_patient_name or "Unknown"

                data.append({
                    'Date': c.date.strftime('%Y-%m-%d'),
                    'Patient Type': c.patient_type,
                    'Patient Name': patient_name,
                    'Doctor': c.doctor_name or '',
                    'Diagnosis': c.diagnosis or '',
                    'Location': c.medical_center.name if c.medical_center else 'Main'
                })
            
            if request.query_params.get('export_format') == 'pdf':
                pdf = generate_pdf(export_type, start_date_str or start_date.strftime('%Y-%m-%d'), end_date_str or end_date.strftime('%Y-%m-%d'), data)
                response = HttpResponse(pdf, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{export_type.lower()}_report_{start_date.strftime("%Y-%m-%d")}.pdf"'
                return response
            return Response(data)

        return Response({"error": "Invalid export type"}, status=400)
def generate_dashboard_pdf(start_date_str, end_date_str):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom Styles
    header_style = ParagraphStyle(
        name='HeaderStyle', parent=styles['Normal'], alignment=1, fontName='Helvetica-Bold', fontSize=10, spaceAfter=2, textColor=colors.HexColor('#1f2937')
    )
    title_style = ParagraphStyle(
        name='TitleStyle', parent=styles['Heading1'], alignment=1, fontName='Helvetica-Bold', fontSize=16, spaceBefore=20, spaceAfter=15, textColor=colors.HexColor('#111827')
    )
    section_style = ParagraphStyle(
        name='SectionStyle', parent=styles['Heading2'], alignment=0, fontName='Helvetica-Bold', fontSize=14, spaceBefore=20, spaceAfter=10, textColor=colors.HexColor('#1e40af'),
        borderPadding=(0,0,4,0), borderBottomWidth=1, borderBottomColor=colors.HexColor('#1e40af')
    )
    meta_style = ParagraphStyle(
        name='MetaStyle', parent=styles['Normal'], alignment=0, fontName='Helvetica', fontSize=10, spaceAfter=20, textColor=colors.HexColor('#4b5563')
    )
    normal_style = styles['Normal']
    
    # Official Header
    elements.extend([
        Paragraph("RÉPUBLIQUE DÉMOCRATIQUE DU CONGO", header_style),
        Paragraph("MINISTÈRE DE LA SANTÉ PUBLIQUE", header_style),
        Paragraph("INSTITUT CONGOLAIS POUR LA CONSERVATION DE LA NATURE", header_style),
        Paragraph("PARC NATIONAL DE L'UPEMBA", header_style),
        Paragraph("CENTRE MÉDICAL", header_style)
    ])
    
    # Divider line
    line_data = [['']]
    line_table = Table(line_data, colWidths=[doc.width])
    line_table.setStyle(TableStyle([('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor('#1f2937')), ('BOTTOMPADDING', (0,0), (-1,-1), 10)]))
    elements.extend([line_table, Spacer(1, 10)])
    
    # Report Title & Meta
    elements.append(Paragraph("RAPPORT: TABLEAU DE BORD GLOBAL", title_style))

    generation_date = datetime.date.today().strftime('%Y-%m-%d')
    elements.append(Paragraph(f"<b>Période couverte :</b> {start_date_str} au {end_date_str}<br/><b>Date d'émission :</b> {generation_date}", meta_style))
    
    # --- FETCH DATA ---
    today = timezone.localdate()
    try:
        start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else today - timedelta(days=30)
        end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else today
    except ValueError:
        start_date = today - timedelta(days=30)
        end_date = today

    # 1. Overview KPIs
    total_employees = Employee.objects.filter(is_deleted=False).count()
    total_dependents = Dependent.objects.count()
    
    # Use date__lt=end_date + 1 day to ensure we include the entire end_date (because date is a DateTimeField)
    end_date_inclusive = end_date + timedelta(days=1)
    total_consultations = Consultation.objects.filter(date__gte=start_date, date__lt=end_date_inclusive).count()
    active_centers = MedicalCenter.objects.count()

    elements.append(Paragraph("1. APERÇU GÉNÉRAL", section_style))
    overview_data = [
        ['Métrique', 'Valeur'],
        ['Total Employés Actifs', str(total_employees)],
        ['Total Dépendants', str(total_dependents)],
        ['Consultations (Période)', str(total_consultations)],
        ['Centres Médicaux', str(active_centers)]
    ]
    t_overview = Table(overview_data, colWidths=[doc.width*0.7, doc.width*0.3], hAlign='LEFT')
    t_overview.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#374151')), ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f9fafb')])
    ]))
    elements.extend([t_overview, Spacer(1, 15)])

    # 2. Consultations Types
    elements.append(Paragraph("2. RÉPARTITION DES CONSULTATIONS", section_style))
    patient_types = Consultation.objects.filter(date__gte=start_date, date__lt=end_date_inclusive).values('patient_type').annotate(count=Count('id'))
    if patient_types:
        cons_data = [['Type de Patient', 'Nombre de Consultations']]
        for pt in patient_types:
            cons_data.append([pt['patient_type'], str(pt['count'])])
        t_cons = Table(cons_data, colWidths=[doc.width*0.7, doc.width*0.3], hAlign='LEFT')
        t_cons.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#374151')), ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        elements.extend([t_cons, Spacer(1, 15)])
    else:
        elements.append(Paragraph("Aucune consultation enregistrée sur cette période.", normal_style))

    # 3. Pharmacy Alerts
    elements.append(Paragraph("3. ALERTES PHARMACIE", section_style))
    stocks = PharmacyStock.objects.select_related('medicine', 'medical_center').all()
    low_stock = []
    for s in stocks:
        limit = s.medicine.min_stock_level if s.medicine.min_stock_level is not None else 10
        if s.quantity <= limit:
            low_stock.append([s.medicine.name, str(s.quantity), str(limit), s.medical_center.name if s.medical_center else 'Main'])
    
    if low_stock:
        elements.append(Paragraph("<b>Articles en Rupture / Stock Bas :</b>", normal_style))
        elements.append(Spacer(1, 5))
        ls_data = [['Médicament', 'En Stock', 'Minimum', 'Centre']] + low_stock
        col_w = doc.width / 4
        t_ls = Table(ls_data, colWidths=[col_w]*4, hAlign='LEFT')
        t_ls.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#b91c1c')), ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fef2f2')])
        ]))
        elements.extend([t_ls, Spacer(1, 15)])
    else:
        elements.append(Paragraph("Aucune alerte de stock bas.", normal_style))
        elements.append(Spacer(1, 15))

    # Expiring Batches

    ninety_days_from_now = today + timedelta(days=90)
    expiring_batches_qs = MedicineBatch.objects.filter(quantity__gt=0, expiration_date__lte=ninety_days_from_now).select_related('medicine')
    
    if expiring_batches_qs.exists():
        elements.append(Paragraph("<b>Lots Expirant Bientôt (90 jours) :</b>", normal_style))
        elements.append(Spacer(1, 5))
        eb_data = [['Médicament', 'Lot', 'Quantité', 'Date Expiration']]
        for b in expiring_batches_qs:
            eb_data.append([b.medicine.name, b.lot_number, str(b.quantity), b.expiration_date.strftime('%Y-%m-%d') if b.expiration_date else 'N/A'])
        col_w = doc.width / 4
        t_eb = Table(eb_data, colWidths=[col_w]*4, hAlign='LEFT')
        t_eb.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#c2410c')), ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fff7ed')])
        ]))
        elements.append(t_eb)
    else:
        elements.append(Paragraph("Aucun lot n'expire dans les 90 prochains jours.", normal_style))
        
    # Signature Block
    elements.append(Spacer(1, 40))
    sig_table = Table([[Paragraph("<b>Infirmière en Chef</b>", ParagraphStyle(name='s1', alignment=2, fontName='Helvetica'))]], colWidths=[doc.width])
    sig_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'RIGHT')]))
    name_table = Table([[Paragraph("<b>Anne-marie Ndeze</b>", ParagraphStyle(name='s2', alignment=2, fontName='Helvetica'))]], colWidths=[doc.width])
    name_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'RIGHT')]))
    elements.extend([sig_table, Spacer(1, 40), name_table])
    
    def add_page_number(canvas, doc):
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#6b7280'))
        canvas.drawRightString(doc.pagesize[0] - 40, 20, f"Page {canvas.getPageNumber()}")
        canvas.drawString(40, 20, "Parc National de l'Upemba - Système de Gestion Médicale")

    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_pharmacy_dashboard_pdf(start_date_str, end_date_str):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom Styles
    header_style = ParagraphStyle(
        name='HeaderStyle', parent=styles['Normal'], alignment=1, fontName='Helvetica-Bold', fontSize=10, spaceAfter=2, textColor=colors.HexColor('#1f2937')
    )
    title_style = ParagraphStyle(
        name='TitleStyle', parent=styles['Heading1'], alignment=1, fontName='Helvetica-Bold', fontSize=16, spaceBefore=20, spaceAfter=15, textColor=colors.HexColor('#111827')
    )
    section_style = ParagraphStyle(
        name='SectionStyle', parent=styles['Heading2'], alignment=0, fontName='Helvetica-Bold', fontSize=14, spaceBefore=20, spaceAfter=10, textColor=colors.HexColor('#1e40af'),
        borderPadding=(0,0,4,0), borderBottomWidth=1, borderBottomColor=colors.HexColor('#1e40af')
    )
    meta_style = ParagraphStyle(
        name='MetaStyle', parent=styles['Normal'], alignment=0, fontName='Helvetica', fontSize=10, spaceAfter=20, textColor=colors.HexColor('#4b5563')
    )
    normal_style = styles['Normal']
    
    # Official Header
    elements.extend([
        Paragraph("RÉPUBLIQUE DÉMOCRATIQUE DU CONGO", header_style),
        Paragraph("MINISTÈRE DE LA SANTÉ PUBLIQUE", header_style),
        Paragraph("INSTITUT CONGOLAIS POUR LA CONSERVATION DE LA NATURE", header_style),
        Paragraph("PARC NATIONAL DE L'UPEMBA", header_style),
        Paragraph("CENTRE MÉDICAL", header_style)
    ])
    
    # Divider line
    line_data = [['']]
    line_table = Table(line_data, colWidths=[doc.width])
    line_table.setStyle(TableStyle([('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor('#1f2937')), ('BOTTOMPADDING', (0,0), (-1,-1), 10)]))
    elements.extend([line_table, Spacer(1, 10)])
    
    # Report Title & Meta
    elements.append(Paragraph("RAPPORT: ANALYSE PHARMACIE", title_style))

    generation_date = datetime.date.today().strftime('%Y-%m-%d')
    elements.append(Paragraph(f"<b>Période couverte :</b> {start_date_str} au {end_date_str}<br/><b>Date d'émission :</b> {generation_date}", meta_style))
    
    # --- FETCH DATA ---
    today = timezone.localdate()
    try:
        start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else today - timedelta(days=30)
        end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else today
    except ValueError:
        start_date = today - timedelta(days=30)
        end_date = today

    movements_qs = StockMovement.objects.filter(date__gte=start_date, date__lte=end_date)

    # 1. Pharmacy KPIs
    current_stock_total = PharmacyStock.objects.aggregate(total=Sum('quantity'))['total'] or 0
    stock_in = movements_qs.filter(movement_type='IN').aggregate(total=Sum('quantity'))['total'] or 0
    stock_out = movements_qs.filter(movement_type__in=['OUT', 'DISPENSE']).aggregate(total=Sum('quantity'))['total'] or 0

    elements.append(Paragraph("1. APERÇU DE LA PHARMACIE", section_style))
    overview_data = [
        ['Métrique', 'Valeur'],
        ['Total Articles en Stock (Actuel)', str(current_stock_total)],
        ['Total Entrées (Période)', str(stock_in)],
        ['Total Sorties / Distribués (Période)', str(stock_out)]
    ]
    t_overview = Table(overview_data, colWidths=[doc.width*0.7, doc.width*0.3], hAlign='LEFT')
    t_overview.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#374151')), ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f9fafb')])
    ]))
    elements.extend([t_overview, Spacer(1, 15)])

    # 2. Top Dispensed
    elements.append(Paragraph("2. MÉDICAMENTS LES PLUS DISTRIBUÉS", section_style))
    dispensed_movements = movements_qs.filter(
        movement_type__in=['DISPENSE', 'OUT']
    ).values('medicine__name').annotate(
        total_quantity=Sum('quantity')
    ).order_by('-total_quantity')[:10]
    
    if dispensed_movements:
        disp_data = [['Médicament', 'Quantité Distribuée']]
        for pt in dispensed_movements:
            disp_data.append([pt['medicine__name'], str(pt['total_quantity'])])
        t_disp = Table(disp_data, colWidths=[doc.width*0.7, doc.width*0.3], hAlign='LEFT')
        t_disp.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#374151')), ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        elements.extend([t_disp, Spacer(1, 15)])
    else:
        elements.append(Paragraph("Aucun médicament distribué sur cette période.", normal_style))

    # 3. Pharmacy Alerts (Low Stock)
    elements.append(Paragraph("3. ALERTES DE STOCK", section_style))
    stocks = PharmacyStock.objects.select_related('medicine', 'medical_center').all()
    low_stock = []
    for s in stocks:
        limit = s.medicine.min_stock_level if s.medicine.min_stock_level is not None else 10
        if s.quantity <= limit:
            low_stock.append([s.medicine.name, str(s.quantity), str(limit), s.medical_center.name if s.medical_center else 'Main'])
    
    if low_stock:
        elements.append(Paragraph("<b>Articles en Rupture / Stock Bas :</b>", normal_style))
        elements.append(Spacer(1, 5))
        ls_data = [['Médicament', 'En Stock', 'Minimum', 'Centre']] + low_stock
        col_w = doc.width / 4
        t_ls = Table(ls_data, colWidths=[col_w]*4, hAlign='LEFT')
        t_ls.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#b91c1c')), ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fef2f2')])
        ]))
        elements.extend([t_ls, Spacer(1, 15)])
    else:
        elements.append(Paragraph("Aucune alerte de stock bas.", normal_style))
        elements.append(Spacer(1, 15))

    # 4. Expiring Batches
    elements.append(Paragraph("4. LOTS EXPIRANT BIENTÔT", section_style))

    ninety_days_from_now = today + timedelta(days=90)
    expiring_batches_qs = MedicineBatch.objects.filter(quantity__gt=0, expiration_date__lte=ninety_days_from_now).select_related('medicine')
    
    if expiring_batches_qs.exists():
        elements.append(Paragraph("<b>Lots Expirant Bientôt (90 jours) :</b>", normal_style))
        elements.append(Spacer(1, 5))
        eb_data = [['Médicament', 'Lot', 'Quantité', 'Date Expiration']]
        for b in expiring_batches_qs:
            eb_data.append([b.medicine.name, b.lot_number, str(b.quantity), b.expiration_date.strftime('%Y-%m-%d') if b.expiration_date else 'N/A'])
        col_w = doc.width / 4
        t_eb = Table(eb_data, colWidths=[col_w]*4, hAlign='LEFT')
        t_eb.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#c2410c')), ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fff7ed')])
        ]))
        elements.append(t_eb)
    else:
        elements.append(Paragraph("Aucun lot n'expire dans les 90 prochains jours.", normal_style))
        
    # Signature Block
    elements.append(Spacer(1, 40))
    sig_table = Table([[Paragraph("<b>Infirmière en Chef</b>", ParagraphStyle(name='s1', alignment=2, fontName='Helvetica'))]], colWidths=[doc.width])
    sig_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'RIGHT')]))
    name_table = Table([[Paragraph("<b>Anne-marie Ndeze</b>", ParagraphStyle(name='s2', alignment=2, fontName='Helvetica'))]], colWidths=[doc.width])
    name_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'RIGHT')]))
    elements.extend([sig_table, Spacer(1, 40), name_table])
    
    def add_page_number(canvas, doc):
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#6b7280'))
        canvas.drawRightString(doc.pagesize[0] - 40, 20, f"Page {canvas.getPageNumber()}")
        canvas.drawString(40, 20, "Parc National de l'Upemba - Système de Gestion Médicale")

    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

