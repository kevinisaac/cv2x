import logging

from zephony.models import BaseModel, db

logger = logging.getLogger(__name__)


class EmailNewsletter(BaseModel):
    __tablename__ = 'email_newsletters'

    name = db.Column(db.String)
    description = db.Column(db.String)

    readable_fields = [
        'name',
        'description',
    ]

