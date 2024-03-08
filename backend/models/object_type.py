import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class ObjectType(BaseModel):
    __tablename__ = 'object_types'

    name = db.Column(db.String, index=True)
    model_name = db.Column(db.String, index=True)

    readable_fields = [
        'name',
        'model_name',
    ]

