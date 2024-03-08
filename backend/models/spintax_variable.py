import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class SpintaxVariable(BaseModel):
    __tablename__ = 'spintax_variables'

    name = db.Column(db.String, index=True)
    id_template = db.Column(
        db.Integer, db.ForeignKey('templates.id', name='fk_templates'), index=True
    )

    readable_fields = [
        'name',
        'token',
    ]

