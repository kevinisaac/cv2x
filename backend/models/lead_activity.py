import logging

from zephony.models import BaseModel, db
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


logger = logging.getLogger(__name__)

class LeadActivity(BaseModel):
    __tablename__ = 'lead_activities'

    type_ = db.Column(db.String)    # open/click/reply/viewed-budget
    activity_time = db.Column(db.DateTime)
    headers = db.Column(JSONB)   # Not used for replies

    # Open related
    tracking_pixel_url = db.Column(db.String)
    id_lead = db.Column(
        db.Integer,
        db.ForeignKey('leads.id', name='fk_leads'),
    )

    # Click related
    exhibit_app_url = db.Column(db.String)
    id_email = db.Column(
        db.Integer,
        db.ForeignKey('emails.id', name='fk_emails'),
    )

    # Reply related
    id_email_reply = db.Column(
        db.Integer,
        db.ForeignKey('emails.id', name='fk_emails_reply'),
    )

    readable_fields = [
        'type_',
        'activity_time',
        'headers',
        'tracking_pixel_url',
        'exhibit_app_url',
    ]

