import logging

from zephony.models import BaseModel, db
from sqlalchemy import ARRAY


logger = logging.getLogger(__name__)

class FailedReason(BaseModel):
    __tablename__ = 'failed_reasons'

    # token = db.Column(db.String)
    name = db.Column(db.String)
    description = db.Column(db.String)

    readable_fields = [
        'name',
        'description',
    ]

