import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Role(BaseModel):
    __tablename__ = 'roles'

    name = db.Column(db.String, index=True)
    permission_bit_sequence = db.Column(db.String, index=True)

    readable_fields = [
        'name',
        'permission_bit_sequence',
    ]

