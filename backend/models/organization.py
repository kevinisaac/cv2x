import logging

from zephony.models import BaseModel, db

logger = logging.getLogger(__name__)

class Organization(BaseModel):
    __tablename__ = 'organizations'

    name = db.Column(db.String, index=True)
    
    readable_fields = [
        'name',
    ]

