import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Industry(BaseModel):
    __tablename__ = 'industries'

    # name = db.Column(db.String, index=True)
    name = db.Column(db.String)
    lowercase_for_template = db.Column(db.String)


    readable_fields = [
        'name',
        'lowercase_for_template',
    ]

