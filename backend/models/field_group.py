import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class FieldGroup(BaseModel):
    __tablename__ = 'field_groups'

    name = db.Column(db.String)
    description = db.Column(db.String)
    # object_ = db.Column('object', db.String)    # lead/company
    id_object_type = db.Column(db.Integer, db.ForeignKey('object_types.id', name='fk_object_types'))

    readable_fields = [
        'name',
        'description',
        # 'object_',
    ]

