from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from auth.dependencies import require_scope
from database.core import get_db
from shared.exceptions import CustomerNotFoundError
from reporting.service import generate_transactions_csv, generate_transactions_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get(
    "/customers/{customer_id}/transactions",
    response_class=StreamingResponse,
)
async def export_customer_transactions(
    customer_id: str,
    db=Depends(get_db),
    user=Depends(require_scope("manager")),
):
    try:
        csv_content = await generate_transactions_csv(customer_id, db)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    filename = f"transactions-{customer_id}.csv"
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/customers/{customer_id}/transactions/pdf",
    response_class=StreamingResponse,
)
async def export_customer_transactions_pdf(
    customer_id: str,
    db=Depends(get_db),
    user=Depends(require_scope("manager")),
):
    try:
        pdf_content = await generate_transactions_pdf(customer_id, db)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    filename = f"transactions-{customer_id}.pdf"
    return StreamingResponse(
        iter([pdf_content]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/me/transactions",
    response_class=StreamingResponse,
)
async def export_my_transactions(
    db=Depends(get_db),
    user=Depends(require_scope("customer")),
):
    customer_id = user["sub"]
    try:
        csv_content = await generate_transactions_csv(customer_id, db)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    filename = f"transactions-{customer_id}.csv"
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/me/transactions/pdf",
    response_class=StreamingResponse,
)
async def export_my_transactions_pdf(
    db=Depends(get_db),
    user=Depends(require_scope("customer")),
):
    customer_id = user["sub"]
    try:
        pdf_content = await generate_transactions_pdf(customer_id, db)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    filename = f"transactions-{customer_id}.pdf"
    return StreamingResponse(
        iter([pdf_content]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
