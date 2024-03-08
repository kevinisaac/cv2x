import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Permission(BaseModel):
    __tablename__ = 'permissions'

    name = db.Column(db.String, index=True) # Default in english
    operation_type = db.Column(db.String)
    description = db.Column(db.String) # Default in english
    module = db.Column(db.String)
    order_id = db.Column(db.Integer)
    dependent_permissions_bit_sequence = db.Column(db.String, index=True)
    is_actions = db.Column(db.Boolean)
    permission_bit = db.Column(db.String, unique=True, index=True)

    readable_fields = [
        'name',
        'module',
        'order_id',
        'is_actions',
        'description',
        'permission_bit',
        'operation_type',
    ]

