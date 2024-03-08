import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Level1SubDivision(BaseModel):
    __tablename__ = 'level_1_sub_divisions'

    name = db.Column(db.String, index=True)
    alpha_code = db.Column(db.String)
    id_country = db.Column(
        db.Integer, db.ForeignKey('countries.id', name='fk_countries'), index=True
    )

    readable_fields = [
        'name',
        'token',
        'alpha_code',
    ]

