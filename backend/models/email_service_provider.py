import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class EmailServiceProvider(BaseModel):
    __tablename__ = 'email_service_providers'

    name = db.Column(db.String)

    readable_fields = [
        'name',
    ]

