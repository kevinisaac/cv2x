import logging

from zephony.models import BaseModel, db
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB

logger = logging.getLogger(__name__)

class NeverBounceIntegration(BaseModel):
    __tablename__ = 'never_bounce_integrations'

    job_id = db.Column(db.Integer)
    status = db.Column(db.String)
    request_payload = db.Column(JSONB, server_default=text("'{}'::jsonb"))
    job_response_payload = db.Column(JSONB, server_default=text("'{}'::jsonb"))
    result_response_payload = db.Column(JSONB, server_default=text("'{}'::jsonb"))

    readable_fields = [
        'status',
        'job_id',
        'payload',
        'job_response_payload',
        'result_response_payload',
    ]

