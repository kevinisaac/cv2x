import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class DomainScoreService(BaseModel):
    __tablename__ = 'domain_score_services'

    name = db.Column(db.String)
    website = db.Column(db.String)    # Without the www or https://

    readable_fields = [
        'name',
        'website',
    ]

