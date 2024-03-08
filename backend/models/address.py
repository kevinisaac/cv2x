import logging
logger = logging.getLogger(__name__)

from zephony.models import BaseModel, db

class Address(BaseModel):
    __tablename__ = 'addresses'

    id_country = db.Column(
        db.Integer, db.ForeignKey('countries.id', name='fk_countries'), index=True
    )
    id_level_1_sub_division = db.Column(
        db.Integer, db.ForeignKey('level_1_sub_divisions.id', name='fk_level_1_sub_divisions'), index=True
    )
    id_level_2_sub_division = db.Column(
        db.Integer, db.ForeignKey('level_2_sub_divisions.id', name='fk_level_2_sub_divisions'), index=True
    )
    id_city = db.Column(
        db.Integer, db.ForeignKey('cities.id', name='fk_cities'), index=True
    )
    basic_info = db.Column(db.String, index=True)
    pincode = db.Column(db.String, index=True)
    locality = db.Column(db.String, index=True)
    landmark = db.Column(db.String, index=True)

    readable_fields = [
        'basic_info',
        'landmark',
        'locality',
        'pincode',
    ]
    
