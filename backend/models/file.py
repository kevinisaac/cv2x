import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class File(BaseModel):
    __tablename__ = 'files'

    original_name = db.Column(db.String)
    name = db.Column(db.String)
    path = db.Column(db.String)
    type_ = db.Column(db.String)

    id_user = db.Column(db.Integer, db.ForeignKey('users.id', name='fk_users'))

    readable_fields = [
        'original_name',
        'name',
        'path',
        'type_',
    ]

