import logging

from zephony.models import BaseModel, db
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


logger = logging.getLogger(__name__)

class NeverbounceValidationAttempt(BaseModel):
    __tablename__ = 'neverbounce_validation_attempts'

    external_job_id = db.Column(db.Integer)
    external_status = db.Column(db.String)
    external_status_on = db.Column(db.DateTime)
    external_error_response = db.Column(JSONB, default={})

    request_payload = db.Column(JSONB, default={})
    job_response_payload = db.Column(JSONB, default={})
    result_response_payload = db.Column(JSONB, default={})

    status = db.Column(db.String)
    submitted_on = db.Column(db.DateTime)
    checked_on = db.Column(db.DateTime)
    check_completed_on = db.Column(db.DateTime)
    fetched_on = db.Column(db.DateTime)

    readable_fields = [
        'external_job_id',
        'external_status',
        'external_status_on',
        'external_error_response',

        'request_payload',
        'job_response_payload',
        'result_response_payload',

        'status',
        'submitted_on',
        'checked_on',
        'check_completed_on',
        'fetched_on',
    ]

