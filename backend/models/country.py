import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Country(BaseModel):
    __tablename__ = 'countries'

    name = db.Column(db.String)
    alpha_2 = db.Column(db.String)

    readable_fields = [
        'name',
        'token',
        'alpha_2'
    ]

