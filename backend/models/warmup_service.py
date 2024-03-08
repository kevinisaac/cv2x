import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class WarmupService(BaseModel):
    __tablename__ = 'warmup_services'

    name = db.Column(db.String)

    readable_fields = [
        'name',
    ]

