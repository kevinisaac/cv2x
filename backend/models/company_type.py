import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class CompanyType(BaseModel):
    __tablename__ = 'company_types'

    name = db.Column(db.String)

    readable_fields = [
        'name',
    ]

