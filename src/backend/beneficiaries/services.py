from datetime import datetime
import io
import requests
from openpyxl.styles import Font, PatternFill, Alignment, Side, Border
import re
import uuid
import openpyxl
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from core.audit import log_action
from beneficiaries.models import Employee, Dependent
from locations.models import Region, Site

class EmployeeService:
    @staticmethod
    @transaction.atomic
    def create_employee(user, employee_number, nom, prenom, site_id=None, post_nom=None, address=None, employment_status='ACTIVE'):
        """
        Creates a new employee and logs the transaction.
        """
        site = Site.objects.get(pk=site_id) if site_id else None
        
        # Check duplicate employee number
        if Employee.objects.filter(employee_number=employee_number).exists():
            raise ValueError(f"Employee number '{employee_number}' is already in use.")

        employee = Employee.objects.create(
            employee_number=employee_number,
            nom=nom.upper().strip(),
            post_nom=post_nom.strip() if post_nom else None,
            prenom=prenom.strip(),
            site=site,
            address=address,
            employment_status=employment_status
        )
        
        log_action(
            user=user,
            action='CREATE',
            instance=employee,
            changes={
                "employee_number": [None, employee.employee_number],
                "name": [None, f"{employee.nom} {employee.prenom}"],
                "site": [None, site.name if site else None]
            }
        )
        return employee

    @staticmethod
    @transaction.atomic
    def update_employee(user, employee_id, **fields):
        """
        Updates an employee instance and logs the audit trail.
        """
        employee = Employee.objects.get(pk=employee_id)
        changes = {}
        
        for field, value in fields.items():
            if hasattr(employee, field):
                old_val = getattr(employee, field)
                
                # Special styling constraints
                if field == 'nom' and value:
                    value = value.upper().strip()
                elif field in ['prenom', 'post_nom'] and value:
                    value = value.strip()
                
                if old_val != value:
                    setattr(employee, field, value)
                    changes[field] = [str(old_val), str(value)]
                    
        if changes:
            employee.save()
            log_action(user=user, action='UPDATE', instance=employee, changes=changes)
            
        return employee

    @staticmethod
    @transaction.atomic
    def delete_employee(user, employee_id):
        """
        Soft-deletes an employee and logs the transaction.
        """
        employee = Employee.objects.get(pk=employee_id)
        employee.delete()  # Performs soft delete
        
        log_action(
            user=user,
            action='DELETE',
            instance=employee,
            changes={"is_deleted": [False, True]}
        )
        return employee


class DependentService:
    @staticmethod
    @transaction.atomic
    def add_dependent(user, employee_id, full_name, gender, relationship, birth_date=None):
        """
        Adds a dependent to an employee.
        """
        employee = Employee.objects.get(pk=employee_id)
        
        # Check duplicate dependent per employee
        if Dependent.objects.filter(employee=employee, full_name=full_name.strip(), relationship=relationship).exists():
            raise ValueError(f"Dependent '{full_name}' is already registered as a {relationship.lower()} for this employee.")
            
        dependent = Dependent.objects.create(
            employee=employee,
            full_name=full_name.strip(),
            gender=gender,
            relationship=relationship,
            birth_date=birth_date
        )
        
        log_action(
            user=user,
            action='CREATE',
            instance=dependent,
            changes={
                "employee": [None, employee.employee_number],
                "full_name": [None, dependent.full_name],
                "relationship": [None, dependent.relationship]
            }
        )
        return dependent


class ExcelImportService:
    @staticmethod
    def _parse_names(full_name_str):
        """
        Parses combined 'Post-nom et Prénom' into post_nom, prenom, and nom.
        Tailored to DRC naming conventions:
        - If 1 token is found: Treated as nom, post_nom and prenom are empty.
        - If 2 tokens are found: First is nom, second is post_nom, prenom is empty.
        - If 3 or more tokens are found: First is nom, last is prenom, middle tokens are post_nom.
        """
        if not full_name_str:
            return "", "", ""
        
        tokens = [t.strip() for t in str(full_name_str).split() if t.strip()]
        if not tokens:
            return "", "", ""
        
        if len(tokens) == 1:
            return "", "", tokens[0]
            
        if len(tokens) == 2:
            return tokens[1], "", tokens[0]
            
        nom = tokens[0]
        prenom = tokens[-1]
        post_nom = " ".join(tokens[1:-1])
        return post_nom, prenom, nom

    @staticmethod
    def _generate_employee_number(sequence):
        """
        Generates a standardized employee number if missing.
        Format: EMP-2026-{sequence:04d}
        """
        current_year = timezone.now().year
        return f"EMP-{current_year}-{sequence:04d}"

    @classmethod
    @transaction.atomic
    def import_excel(cls, user, file_file):
        """
        Imports beneficiaries from an Excel file.
        Each worksheet represents a Region.
        """
        workbook = openpyxl.load_workbook(file_file, data_only=True)
        report = {
            "success": True,
            "summary": {
                "regions_created": 0,
                "sites_created": 0,
                "employees_created": 0,
                "employees_updated": 0,
                "dependents_created": 0,
                "errors_count": 0,
                "warnings_count": 0
            },
            "sheets_processed": [],
            "logs": []
        }
        
        emp_sequence = Employee.objects.count() + 1
        
        for sheet_name in workbook.sheetnames:
            sheet = workbook[sheet_name]
            region_name = sheet_name.strip()
            
            if not region_name or sheet.max_row <= 1:
                continue
                
            # Auto-create Region
            region, region_created = Region.objects.get_or_create(name=region_name)
            if region_created:
                report["summary"]["regions_created"] += 1
                report["logs"].append({
                    "level": "INFO",
                    "sheet": region_name,
                    "row": None,
                    "message": f"Region '{region_name}' created automatically."
                })
                
            # Auto-create default site inside this region
            site_name = "Centrale"
            site, site_created = Site.objects.get_or_create(region=region, name=site_name)
            if site_created:
                report["summary"]["sites_created"] += 1
                
            sheet_info = {
                "name": region_name,
                "rows_processed": 0,
                "employees_created": 0,
                "dependents_created": 0
            }
            
            current_employee = None
            
            # Read header
            headers = [cell.value for cell in sheet[1]]
            
            # Map column names to index numbers
            # Target columns: N, Nom, Post-nom et Prénom, Épouse, Nom de l'enfant, Année de naissance, Sexe, Addresse
            col_map = {}
            for idx, h in enumerate(headers):
                if not h:
                    continue
                h_clean = str(h).strip().lower()
                if 'n' == h_clean or 'n°' in h_clean:
                    col_map['n'] = idx
                elif 'nom' == h_clean:
                    col_map['nom'] = idx
                elif 'post-nom' in h_clean or 'prenom' in h_clean or 'prénom' in h_clean:
                    col_map['post_prenom'] = idx
                elif 'epouse' in h_clean or 'épouse' in h_clean:
                    col_map['epouse'] = idx
                elif 'enfant' in h_clean:
                    col_map['enfant'] = idx
                elif 'naissance' in h_clean or 'annee' in h_clean or 'année' in h_clean:
                    col_map['naissance'] = idx
                elif 'sexe' in h_clean or 'gender' in h_clean:
                    col_map['sexe'] = idx
                elif 'addresse' in h_clean or 'adresse' in h_clean:
                    col_map['adresse'] = idx

            # Fallback mappings if columns didn't match perfectly
            if 'nom' not in col_map and len(headers) > 1:
                col_map['nom'] = 1
            if 'post_prenom' not in col_map and len(headers) > 2:
                col_map['post_prenom'] = 2
            if 'epouse' not in col_map and len(headers) > 3:
                col_map['epouse'] = 3
            if 'enfant' not in col_map and len(headers) > 4:
                col_map['enfant'] = 4
            if 'naissance' not in col_map and len(headers) > 5:
                col_map['naissance'] = 5
            if 'sexe' not in col_map and len(headers) > 6:
                col_map['sexe'] = 6
            if 'adresse' not in col_map and len(headers) > 7:
                col_map['adresse'] = 7

            for r_idx in range(2, sheet.max_row + 1):
                row = [cell.value for cell in sheet[r_idx]]
                
                # Skip completely blank rows
                if not any(row):
                    continue
                    
                sheet_info["rows_processed"] += 1
                
                # Fetch row cell values safely
                n_val = str(row[col_map['n']]).strip() if col_map.get('n') is not None and row[col_map['n']] is not None else ""
                nom_val = str(row[col_map['nom']]).strip() if col_map.get('nom') is not None and row[col_map['nom']] is not None else ""
                post_prenom_val = str(row[col_map['post_prenom']]).strip() if col_map.get('post_prenom') is not None and row[col_map['post_prenom']] is not None else ""
                epouse_val = str(row[col_map['epouse']]).strip() if col_map.get('epouse') is not None and row[col_map['epouse']] is not None else ""
                enfant_val = str(row[col_map['enfant']]).strip() if col_map.get('enfant') is not None and row[col_map['enfant']] is not None else ""
                naissance_val = str(row[col_map['naissance']]).strip() if col_map.get('naissance') is not None and row[col_map['naissance']] is not None else ""
                sexe_val = str(row[col_map['sexe']]).strip().upper() if col_map.get('sexe') is not None and row[col_map['sexe']] is not None else ""
                adresse_val = str(row[col_map['adresse']]).strip() if col_map.get('adresse') is not None and row[col_map['adresse']] is not None else ""

                # --- 1. PROCESS EMPLOYEE ---
                if nom_val or post_prenom_val:
                    post_nom, prenom, parsed_nom = cls._parse_names(post_prenom_val)
                    employee_nom = (nom_val if nom_val else parsed_nom).strip().upper()
                    
                    # Deduplicate Employee by name within region/site
                    existing_employees = Employee.objects.filter(
                        nom=employee_nom,
                        post_nom=post_nom if post_nom else None,
                        prenom=prenom,
                        site__region=region
                    )
                    
                    if existing_employees.exists():
                        current_employee = existing_employees.first()
                        report["summary"]["employees_updated"] += 1
                        
                        # Update employee fields if changed
                        updated_fields = {}
                        if adresse_val and current_employee.address != adresse_val:
                            old_address = current_employee.address
                            current_employee.address = adresse_val
                            updated_fields["address"] = [old_address, adresse_val]
                            
                        if n_val and not n_val.isdigit() and current_employee.employee_number != n_val:
                            old_emp_no = current_employee.employee_number
                            current_employee.employee_number = n_val
                            updated_fields["employee_number"] = [old_emp_no, n_val]
                        
                        if updated_fields:
                            try:
                                with transaction.atomic():
                                    current_employee.save()
                                    log_action(
                                        user=user,
                                        action='UPDATE',
                                        instance=current_employee,
                                        changes=updated_fields
                                    )
                                display_name = f"{nom_val} {post_prenom_val}".strip() if nom_val else f"{employee_nom} {post_prenom_val}".strip()
                                report["logs"].append({
                                    "level": "INFO",
                                    "sheet": region_name,
                                    "row": r_idx,
                                    "message": f"Employee '{display_name}' already exists and was updated with new data: {', '.join(updated_fields.keys())}. Appending dependents."
                                })
                            except Exception as e:
                                report["summary"]["errors_count"] += 1
                                display_name = f"{nom_val} {post_prenom_val}".strip() if nom_val else f"{employee_nom} {post_prenom_val}".strip()
                                report["logs"].append({
                                    "level": "ERROR",
                                    "sheet": region_name,
                                    "row": r_idx,
                                    "message": f"Failed to update employee '{display_name}': {str(e)}"
                                })
                        else:
                            display_name = f"{nom_val} {post_prenom_val}".strip() if nom_val else f"{employee_nom} {post_prenom_val}".strip()
                            report["logs"].append({
                                "level": "WARNING",
                                "sheet": region_name,
                                "row": r_idx,
                                "message": f"Employee '{display_name}' already exists. Appending dependents."
                            })
                            report["summary"]["warnings_count"] += 1
                    else:
                        # Auto generate employee number if missing or numeric index
                        employee_number = n_val if n_val and not n_val.isdigit() else cls._generate_employee_number(emp_sequence)
                        emp_sequence += 1
                        
                        try:
                            with transaction.atomic():
                                current_employee = Employee.objects.create(
                                    employee_number=employee_number,
                                    nom=employee_nom,
                                    post_nom=post_nom if post_nom else None,
                                    prenom=prenom,
                                    site=site,
                                    address=adresse_val
                                )
                                sheet_info["employees_created"] += 1
                                report["summary"]["employees_created"] += 1
                                
                                # Log audit actions
                                log_action(
                                    user=user,
                                    action='CREATE',
                                    instance=current_employee,
                                    changes={
                                        "employee_number": [None, current_employee.employee_number],
                                        "name": [None, f"{current_employee.nom} {current_employee.prenom}"],
                                        "site": [None, site.name]
                                    }
                                )
                        except Exception as e:
                            report["summary"]["errors_count"] += 1
                            display_name = nom_val if nom_val else employee_nom
                            report["logs"].append({
                                "level": "ERROR",
                                "sheet": region_name,
                                "row": r_idx,
                                "message": f"Failed to create employee '{display_name}': {str(e)}"
                            })
                            current_employee = None
                            continue

                # --- 2. PROCESS SPOUSE ---
                if current_employee and epouse_val and epouse_val.lower() not in ['-', 'none', 'n/a', '']:
                    # Separate multiple spouses if any (e.g. split by comma)
                    spouses = [s.strip() for s in re.split(r'[,&/]', epouse_val) if s.strip()]
                    for spouse_name in spouses:
                        if spouse_name.lower() in ['-', 'none', 'n/a', '']:
                            continue
                        
                        # Add Spouse dependent
                        if not Dependent.objects.filter(employee=current_employee, full_name=spouse_name, relationship='SPOUSE').exists():
                            try:
                                with transaction.atomic():
                                    dep = Dependent.objects.create(
                                        employee=current_employee,
                                        full_name=spouse_name,
                                        gender='F',  # Default gender for wives, can be corrected manually
                                        relationship='SPOUSE'
                                    )
                                    sheet_info["dependents_created"] += 1
                                    report["summary"]["dependents_created"] += 1
                                    
                                    log_action(
                                        user=user,
                                        action='CREATE',
                                        instance=dep,
                                        changes={"employee": [None, current_employee.employee_number], "full_name": [None, spouse_name], "relationship": [None, "SPOUSE"]}
                                    )
                            except Exception as e:
                                report["summary"]["errors_count"] += 1
                                report["logs"].append({
                                    "level": "ERROR",
                                    "sheet": region_name,
                                    "row": r_idx,
                                    "message": f"Failed to add spouse '{spouse_name}' to employee '{current_employee}': {str(e)}"
                                })

                # --- 3. PROCESS CHILD ---
                if current_employee and enfant_val and enfant_val.lower() not in ['-', 'none', 'n/a', '']:
                    # Clean and format gender
                    gender_mapped = 'M'
                    if sexe_val in ['F', 'FEMININ', 'FÉMININ', 'FILLE', 'FEMELLE']:
                        gender_mapped = 'F'
                    elif sexe_val in ['M', 'MASCULIN', 'GARÇON', 'GARCON', 'MALE']:
                        gender_mapped = 'M'
                    else:
                        if sexe_val:
                            report["logs"].append({
                                "level": "WARNING",
                                "sheet": region_name,
                                "row": r_idx,
                                "message": f"Unrecognized gender '{sexe_val}' for child '{enfant_val}'. Defaulted to 'M'."
                            })
                            report["summary"]["warnings_count"] += 1

                    # Parse Birth Year
                    birth_date = None
                    if naissance_val:
                        # Extract 4-digit number
                        year_match = re.search(r'\b(19\d\d|20\d\d)\b', str(naissance_val))
                        if year_match:
                            birth_date = f"{year_match.group(1)}-01-01"
                        else:
                            report["logs"].append({
                                "level": "WARNING",
                                "sheet": region_name,
                                "row": r_idx,
                                "message": f"Could not parse birth year '{naissance_val}' for child '{enfant_val}'."
                            })
                            report["summary"]["warnings_count"] += 1

                    # Create or update child
                    existing_child = Dependent.objects.filter(employee=current_employee, full_name=enfant_val, relationship='CHILD').first()
                    if existing_child:
                        updated_child_fields = {}
                        if gender_mapped and existing_child.gender != gender_mapped:
                            old_gender = existing_child.gender
                            existing_child.gender = gender_mapped
                            updated_child_fields["gender"] = [old_gender, gender_mapped]
                        

                        parsed_birth_date = None
                        if birth_date:
                            try:
                                parsed_birth_date = datetime.strptime(birth_date, "%Y-%m-%d").date()
                            except ValueError:
                                pass
                                
                        if parsed_birth_date and existing_child.birth_date != parsed_birth_date:
                            old_birth = str(existing_child.birth_date) if existing_child.birth_date else None
                            existing_child.birth_date = parsed_birth_date
                            updated_child_fields["birth_date"] = [old_birth, str(parsed_birth_date)]
                            
                        if updated_child_fields:
                            try:
                                with transaction.atomic():
                                    existing_child.save()
                                    log_action(
                                        user=user,
                                        action='UPDATE',
                                        instance=existing_child,
                                        changes=updated_child_fields
                                    )
                                report["logs"].append({
                                    "level": "INFO",
                                    "sheet": region_name,
                                    "row": r_idx,
                                    "message": f"Dependent child '{enfant_val}' already exists and was updated with new data: {', '.join(updated_child_fields.keys())}."
                                })
                            except Exception as e:
                                report["summary"]["errors_count"] += 1
                                report["logs"].append({
                                    "level": "ERROR",
                                    "sheet": region_name,
                                    "row": r_idx,
                                    "message": f"Failed to update child '{enfant_val}' details: {str(e)}"
                                })
                    else:
                        try:
                            with transaction.atomic():
                                dep = Dependent.objects.create(
                                    employee=current_employee,
                                    full_name=enfant_val,
                                    gender=gender_mapped,
                                    relationship='CHILD',
                                    birth_date=birth_date
                                )
                                sheet_info["dependents_created"] += 1
                                report["summary"]["dependents_created"] += 1
                                
                                log_action(
                                    user=user,
                                    action='CREATE',
                                    instance=dep,
                                    changes={"employee": [None, current_employee.employee_number], "full_name": [None, enfant_val], "relationship": [None, "CHILD"]}
                                )
                        except Exception as e:
                            report["summary"]["errors_count"] += 1
                            report["logs"].append({
                                "level": "ERROR",
                                "sheet": region_name,
                                "row": r_idx,
                                "message": f"Failed to add child '{enfant_val}' to employee '{current_employee}': {str(e)}"
                            })

            report["sheets_processed"].append(sheet_info)

        # Log import job action
        if report["summary"]["errors_count"] > 0 and report["summary"]["employees_created"] == 0:
            report["success"] = False

        return report

class CloudImportService:
    @staticmethod
    def download_and_convert_url(url):
        """
        Downloads a file from a URL, handling Google Sheets conversion if necessary.
        Returns a BytesIO object with the file content.
        Raises ValueError if the URL or file content is invalid.
        """

        
        # Google Sheets auto-conversion logic
        original_url = url.strip()
        cleaned_url = original_url
        if 'docs.google.com/spreadsheets' in cleaned_url:
            if '/edit' in cleaned_url:
                cleaned_url = cleaned_url.split('/edit')[0] + '/export?format=xlsx'
            elif not cleaned_url.endswith('/export?format=xlsx'):
                if cleaned_url.endswith('/'):
                    cleaned_url = cleaned_url + 'export?format=xlsx'
                else:
                    cleaned_url = cleaned_url + '/export?format=xlsx'

        try:
            # Fetch remote Excel file
            response = requests.get(cleaned_url, timeout=30)
            if response.status_code != 200:
                raise ValueError(f"Failed to download file from URL (HTTP {response.status_code}).")
            
            # Wrap content in BytesIO for openpyxl compatibility
            file_obj = io.BytesIO(response.content)
            
            # Simple XLSX validation check
            content_start = response.content[:4]
            if content_start != b'PK\x03\x04' and not cleaned_url.lower().endswith(('.xlsx', '.xls')):
                raise ValueError("Invalid file content. The cloud URL must point to a valid Excel workbook (.xlsx or .xls).")

            return file_obj
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Network error fetching cloud URL: {str(e)}")


class EmployeeExportService:
    @staticmethod
    def export_to_excel(queryset):
        """
        Builds and returns an openpyxl Workbook from the given Employee queryset.
        """

        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "UMIS_Roster"
        
        # Medical Teal-600 Harmonious Styles
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="0D9488", end_color="0D9488", fill_type="solid") # Teal-600
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
        
        thin_side = Side(border_style="thin", color="E2E8F0") # Slate-200
        border_all = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        
        headers = [
            "Matricule (Employee ID)", 
            "Nom (Last Name)", 
            "Post-nom & Prénom", 
            "Épouse (Spouse)", 
            "Nom de l'enfant (Child)", 
            "Sexe (Gender)", 
            "Année de naissance", 
            "Adresse (Address)", 
            "Site", 
            "Région", 
            "Statut (Status)"
        ]
        
        # Set Row 1 Header style
        ws.row_dimensions[1].height = 28
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align
            cell.border = border_all
            
        # Write dataset
        row_num = 2
        for emp in queryset:
            spouses = [d for d in emp.dependents.all() if d.relationship == 'SPOUSE']
            children = [d for d in emp.dependents.all() if d.relationship == 'CHILD']
            
            max_rows = max(1, len(spouses), len(children))
            
            for i in range(max_rows):
                ws.row_dimensions[row_num].height = 20
                
                # Write parent info on all rows
                ws.cell(row=row_num, column=1, value=emp.employee_number)
                if i == 0:
                    ws.cell(row=row_num, column=2, value=emp.nom)
                    post_name_str = f" {emp.post_nom}" if emp.post_nom else ""
                    ws.cell(row=row_num, column=3, value=f"{post_name_str.strip()} {emp.prenom}".strip())
                    ws.cell(row=row_num, column=8, value=emp.address)
                    ws.cell(row=row_num, column=9, value=emp.site.name if emp.site else "Non assigné")
                    ws.cell(row=row_num, column=10, value=emp.site.region.name if emp.site and emp.site.region else "Sans région")
                    ws.cell(row=row_num, column=11, value=emp.employment_status)
                
                # Write Spouse (if any)
                if i < len(spouses):
                    ws.cell(row=row_num, column=4, value=spouses[i].full_name)
                    
                # Write Child (if any)
                if i < len(children):
                    ws.cell(row=row_num, column=5, value=children[i].full_name)
                    ws.cell(row=row_num, column=6, value=children[i].gender)
                    if children[i].birth_date:
                        ws.cell(row=row_num, column=7, value=children[i].birth_date.year)
                
                # Apply alignments & borders
                for col_num in range(1, 12):
                    cell = ws.cell(row=row_num, column=col_num)
                    cell.border = border_all
                    if col_num in [1, 6, 7, 11]:
                        cell.alignment = center_align
                    else:
                        cell.alignment = left_align
                        
                row_num += 1
                
        # Auto-fit column widths
        for col in ws.columns:
            max_len = 0
            for cell in col:
                if cell.value:
                    max_len = max(max_len, len(str(cell.value)))
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)
            
        return wb
