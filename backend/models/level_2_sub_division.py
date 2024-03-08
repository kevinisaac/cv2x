import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Level2SubDivision(BaseModel):
    __tablename__ = 'level_2_sub_divisions'

    name = db.Column(db.String, index=True)
    alpha_code = db.Column(db.String)
    id_country = db.Column(
        db.Integer, db.ForeignKey('countries.id', name='fk_countries'), index=True
    )
    id_level_1_sub_division = db.Column(
        db.Integer,
        db.ForeignKey('level_1_sub_divisions.id', name='fk_level_1_sub_divisions'),
    )

    readable_fields = [
        'name',
        'token',
        'alpha_code',
    ]

