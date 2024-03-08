import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Template(BaseModel):
    __tablename__ = 'templates'

    name = db.Column(db.String)
    title = db.Column(db.String)
    body = db.Column(db.String)

    readable_fields = [
        'name',
        'title',
        'body',
    ]

