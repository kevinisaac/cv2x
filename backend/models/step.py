import logging

from zephony.models import BaseModel, db
from sqlalchemy import ARRAY


logger = logging.getLogger(__name__)

class Step(BaseModel):
    __tablename__ = 'steps'

    # token = db.Column(db.String)
    name = db.Column(db.String)
    description = db.Column(db.String)
    order = db.Column(db.Integer, unique=True)
    auto_promote = db.Column(db.Boolean)
    auto_promote_on_external_statuses = db.Column(ARRAY(db.String))

    readable_fields = [
        'name',
        'description',
        'order',
        'auto_promote',
        'auto_promote_on_external_statuses',
    ]

