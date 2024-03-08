import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Specialization(BaseModel):
    __tablename__ = 'specializations'

    name = db.Column(db.String)

    readable_fields = [
        'name',
    ]

