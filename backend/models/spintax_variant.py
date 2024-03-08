import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class SpintaxVariant(BaseModel):
    __tablename__ = 'spintax_variants'

    text = db.Column(db.String)
    id_spintax_variable = db.Column(
        db.Integer,
        db.ForeignKey('spintax_variables.id', name='fk_spintax_variables'),
    )

    readable_fields = [
        'text',
    ]

