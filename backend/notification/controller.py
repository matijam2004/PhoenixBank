from fastapi import APIRouter, Depends
from database.core import get_db

from auth.service import get_current_user
from .schemas import Notification, NotificationCreate
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.post("/")
async def create_notification(payload: NotificationCreate, db=Depends(get_db)):

    new_notification = payload.model_dump()
    new_notification['_id'] = ObjectId()
    new_notification['customer_id'] = ObjectId(new_notification.pop('customer_id'))
    new_notification['is_read'] = False
    new_notification['created_at'] = datetime.utcnow()
    
    await db['notifications'].insert_one(new_notification)
    
    return {"message": "Notification created"}


@router.patch("/{notification_id}/read")
async def mark_as_read(notification_id: str, db=Depends(get_db)):
    result = await db['notifications'].update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": 
            {"is_read": True}
        }
    )

    if result.modified_count != 0:
        return {"message": "Marked as read"}
    else:
        return {"message": "No notification modified"}
