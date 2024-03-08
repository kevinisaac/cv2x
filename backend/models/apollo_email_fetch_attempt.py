import logging

from zephony.models import BaseModel, db
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


logger = logging.getLogger(__name__)

class ApolloEmailFetchAttempt(BaseModel):
    __tablename__ = 'apollo_email_fetch_attempts'

    external_status = db.Column(db.String)
    external_status_on = db.Column(db.DateTime)
    external_error_response = db.Column(JSONB, default={})

    readable_fields = [
        'external_status',
        'external_status_on',
        'external_error_response',
    ]

