import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Email(BaseModel):
    __tablename__ = 'emails'

    title = db.Column(db.String)
    body = db.Column(db.Text)
    status = db.Column(db.String)

    scheduled_at = db.Column(db.DateTime)
    sent_at = db.Column(db.DateTime)
    is_cancelled = db.Column(db.Boolean, default=False)
    cancelled_at = db.Column(db.DateTime)

    # RQ job id to cancel if required
    job_id = db.Column(db.String)

    id_email_thread = db.Column(
        db.Integer, db.ForeignKey('email_threads.id', name='fk_email_threads')
    )
    id_email_predecessor = db.Column(
        db.Integer, db.ForeignKey('emails.id', name='fk_emails_predecessor')
    )
    id_template = db.Column(
        db.Integer, db.ForeignKey('templates.id', name='fk_templates')
    )

    # To quickly filter emails by campaign
    id_campaign = db.Column(
        db.Integer, db.ForeignKey('campaigns.id', name='fk_campaigns')
    )

    readable_fields = [
        'title',
        'body',
        'status',

        'job_id',
        'scheduled_at',
        'sent_at',

        'is_cancelled',
        'cancelled_at',
    ]

