from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any, Dict, Iterable, List
from decimal import Decimal

from bson import ObjectId, Decimal128
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from shared.exceptions import CustomerNotFoundError


def _to_float(val):
    """Convert Decimal128, Decimal, or numeric value to float."""
    if isinstance(val, Decimal128):
        return float(val.to_decimal())
    elif isinstance(val, Decimal):
        return float(val)
    elif val is None:
        return 0.0
    else:
        return float(val)


def _parse_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid ObjectId")
    return ObjectId(value)


def _format_datetime(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return ""


async def _fetch_customer(db, customer_id: ObjectId) -> Dict[str, Any]:
    customer = await db["customers"].find_one({"_id": customer_id})
    if not customer:
        raise CustomerNotFoundError("Customer not found")
    return customer


async def _fetch_accounts(db, customer_id: ObjectId) -> Dict[ObjectId, Dict[str, Any]]:
    accounts: Dict[ObjectId, Dict[str, Any]] = {}
    cursor = db["accounts"].find({"customer_id": customer_id})
    async for account in cursor:
        accounts[account["_id"]] = account
    return accounts


async def _fetch_transactions(db, account_ids: Iterable[ObjectId]) -> List[Dict[str, Any]]:
    account_ids = list(account_ids)
    if not account_ids:
        return []
    # Transactions use to_account_id (deposits) and from_account_id (withdrawals/transfers)
    # We need to find transactions where either field matches
    # Ensure all account_ids are ObjectIds
    account_ids = [ObjectId(aid) if not isinstance(aid, ObjectId) else aid for aid in account_ids]
    
    # Match both sides so transfers appear for either account.
    cursor = (
        db["transactions"]
        .find({
            "$or": [
                {"to_account_id": {"$in": account_ids}},
                {"from_account_id": {"$in": account_ids}}
            ]
        })
        .sort("created_at", 1)
    )
    transactions = [transaction async for transaction in cursor]
    return transactions


async def generate_transactions_csv(customer_id: str, db) -> str:
    """Fetch transactions for the customer's accounts and render them as CSV."""
    try:
        customer_oid = _parse_object_id(customer_id)
    except ValueError as exc:
        raise CustomerNotFoundError("Customer not found") from exc

    await _fetch_customer(db, customer_oid)  # ensure customer exists
    accounts = await _fetch_accounts(db, customer_oid)
    account_ids = list(accounts.keys())
    if not account_ids:
        # Return CSV with just header if no accounts
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=["transaction_id", "customer_id", "account_id", "account_type", "type", "status", "amount", "description", "created_at"])
        writer.writeheader()
        return buffer.getvalue()
    
    transactions = await _fetch_transactions(db, account_ids)

    fieldnames = [
        "transaction_id",
        "customer_id",
        "account_id",
        "account_type",
        "type",
        "status",
        "amount",
        "description",
        "created_at",
    ]

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()

    for txn in transactions:
        # Determine which account_id to use (deposits use to_account_id, withdrawals use from_account_id)
        account_id = txn.get("to_account_id") or txn.get("from_account_id")
        account = accounts.get(account_id, {})
        # Convert amount properly for CSV
        amount_val = txn.get("amount")
        amount_str = str(_to_float(amount_val)) if amount_val else "0.00"
        writer.writerow(
            {
                "transaction_id": str(txn["_id"]),
                "customer_id": str(customer_oid),
                "account_id": str(account_id) if account_id else "",
                "account_type": account.get("account_type", ""),
                "type": txn.get("type", ""),
                "status": txn.get("status", ""),
                "amount": amount_str,
                "description": txn.get("description") or "",
                "created_at": _format_datetime(txn.get("created_at")),
            }
        )

    return buffer.getvalue()


async def generate_transactions_pdf(customer_id: str, db) -> bytes:
    """Fetch transactions for the customer's accounts and render them as PDF."""
    try:
        customer_oid = _parse_object_id(customer_id)
    except ValueError as exc:
        raise CustomerNotFoundError("Customer not found") from exc

    customer = await _fetch_customer(db, customer_oid)
    accounts = await _fetch_accounts(db, customer_oid)
    transactions = await _fetch_transactions(db, accounts.keys())

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()

    primary_color = colors.HexColor('#0a0a0a')
    gold_color = colors.HexColor('#d4af37')
    accent_color = gold_color
    dark_bg = colors.HexColor('#1a1a1a')
    light_bg = colors.HexColor('#f5f5f5')
    light_text = colors.HexColor('#b8b8b8')
    border_color = colors.HexColor('#333333')
    success_color = colors.HexColor('#00a896')
    white_color = colors.white

    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=8,
        alignment=TA_CENTER,
        textColor=primary_color,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#666666')
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=15,
        spaceBefore=20,
        alignment=TA_LEFT,
        textColor=primary_color,
        fontName='Helvetica-Bold'
    )
    
    story = []

    story.append(Paragraph("PHOENIX BANK", title_style))
    story.append(Paragraph("Transaction Report", subtitle_style))
    
    # Add decorative line
    line_table = Table([['', '']], colWidths=[2.5*inch, 2.5*inch])
    line_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 3, accent_color),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(line_table)
    story.append(Spacer(1, 25))

    story.append(Paragraph("Customer Information", header_style))
    
    customer_info = [
        ["Customer ID", str(customer_oid)],
        ["Name", f"{customer.get('first_name', '')} {customer.get('last_name', '')}"],
        ["Email", customer.get('email', '')],
        ["Phone", customer.get('phone', '')],
        ["Report Date", datetime.now().strftime("%B %d, %Y at %H:%M")]
    ]
    
    customer_table = Table(customer_info, colWidths=[1.8*inch, 3.7*inch])
    customer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), light_bg),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
        ('TEXTCOLOR', (1, 0), (1, -1), primary_color),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
    ]))
    
    story.append(customer_table)
    story.append(Spacer(1, 30))

    story.append(Paragraph("Transaction History", header_style))
    
    if not transactions:
        no_trans_style = ParagraphStyle(
            'NoTrans',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#666666'),
            alignment=TA_CENTER,
            spaceAfter=20,
            spaceBefore=20
        )
        story.append(Paragraph("No transactions found for this customer.", no_trans_style))
    else:
        transaction_data = [["Date", "Type", "Account", "Amount", "Status"]]
        for txn in transactions:
            account_id = txn.get("to_account_id") or txn.get("from_account_id")
            account = accounts.get(account_id, {})
            amount = _to_float(txn.get("amount"))
            # Truncate long descriptions so they don't push the cell width past the column.
            desc = txn.get("description") or ""
            max_desc_length = 35
            if len(desc) > max_desc_length:
                desc = desc[:max_desc_length-3] + "..."
            
            transaction_data.append([
                _format_datetime(txn.get("created_at"))[:10],
                Paragraph(txn.get("type", "").title(), ParagraphStyle('cell', fontSize=9, fontName='Helvetica')),
                Paragraph(account.get("account_type", "").title(), ParagraphStyle('cell', fontSize=9, fontName='Helvetica')),
                f"${amount:,.2f}",
                Paragraph(txn.get("status", "").title(), ParagraphStyle('cell', fontSize=9, fontName='Helvetica'))
            ])
        
        transaction_table = Table(transaction_data, colWidths=[0.95*inch, 0.95*inch, 1.1*inch, 1.1*inch, 1.0*inch])
        transaction_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), accent_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), primary_color),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (2, -1), 'LEFT'),
            ('ALIGN', (3, 1), (3, -1), 'RIGHT'),
            ('ALIGN', (4, 1), (4, -1), 'CENTER'),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('LEFTPADDING', (0, 1), (-1, -1), 8),
            ('RIGHTPADDING', (0, 1), (-1, -1), 8),
            ('LINEBELOW', (0, 0), (-1, 0), 2, accent_color),
            ('LINEBELOW', (0, 1), (-1, -1), 0.5, border_color),
            ('BOX', (0, 0), (-1, -1), 1, border_color),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        story.append(transaction_table)

        story.append(Spacer(1, 30))
        story.append(Paragraph("Summary", header_style))
        
        total_transactions = len(transactions)
        total_deposits = sum(_to_float(txn.get('amount')) for txn in transactions if txn.get('type') == 'deposit')
        total_withdrawals = sum(_to_float(txn.get('amount')) for txn in transactions if txn.get('type') == 'withdrawal')
        net_balance = total_deposits - total_withdrawals
        
        summary_data = [
            ["Total Transactions", str(total_transactions)],
            ["Total Deposits", f"${total_deposits:,.2f}"],
            ["Total Withdrawals", f"${total_withdrawals:,.2f}"],
            ["Net Balance", f"${net_balance:,.2f}"]
        ]
        
        summary_table = Table(summary_data, colWidths=[2.5*inch, 3*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), light_bg),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
            ('TEXTCOLOR', (1, 0), (1, -1), primary_color),
            ('TEXTCOLOR', (1, 3), (1, 3), success_color),  # Net balance in teal
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 3), (1, 3), 'Helvetica-Bold'),  # Net balance bold
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('BOX', (0, 0), (-1, -1), 1, border_color),
            ('LINEBELOW', (0, 0), (-1, 2), 0.5, border_color),
            ('LINEABOVE', (0, 3), (-1, 3), 2, accent_color),  
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(summary_table)

    story.append(Spacer(1, 40))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#999999'),
        alignment=TA_CENTER
    )
    
    story.append(Paragraph("This report was automatically generated by Phoenix Bank", footer_style))
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}", footer_style))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes