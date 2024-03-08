import logging

from zephony.models import BaseModel, db
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


logger = logging.getLogger(__name__)

class ApolloLeadFetchAttempt(BaseModel):
    __tablename__ = 'apollo_lead_fetch_attempts'

    external_status = db.Column(db.String)
    external_status_on = db.Column(db.DateTime)

    search_url = db.Column(db.String)
    page_number = db.Column(db.Integer)
    id_industry = db.Column(
        db.Integer,
        db.ForeignKey('industries.id', name='fk_industries'),
    )
    external_error_response = db.Column(JSONB, default={})

    readable_fields = [
        'search_url',
        'page_number',
        'id_industry',
        'external_status',
        'external_status_on',
        'external_error_response',
    ]

