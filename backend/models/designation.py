import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Designation(BaseModel):
    __tablename__ = 'designations'

    name = db.Column(db.String)

    readable_fields = [
        'name',
    ]

