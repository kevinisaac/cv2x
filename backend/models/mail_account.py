import logging

from sqlalchemy.dialects.postgresql import JSONB
from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class MailAccount(BaseModel):
    __tablename__ = 'mail_accounts'

    name = db.Column(db.String)         # The sender name displayed on the email
    email = db.Column(db.String)
    api_key = db.Column(db.String)

    is_mailbox_created = db.Column(db.Boolean)
    primary_email = db.Column(db.String)
    warmup_started_on = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    warmup_service_account = db.Column(db.String)   # Email

    # Gmail API token JSON
    token_details = db.Column(JSONB, default={})

    id_warmup_service = db.Column(
        db.Integer,
        db.ForeignKey('warmup_services.id', name='fk_warmup_services'),
    )
    id_domain = db.Column(
        db.Integer,
        db.ForeignKey('domains.id', name='fk_domains'),
    )
    id_email_service_provider = db.Column(
        db.Integer,
        db.ForeignKey('email_service_providers.id', name='fk_email_service_providers'),
    )

    readable_fields = [
        'email',
        'api_key',

        'is_mailbox_created',
        'primary_email',
        'warmup_service',
        'warmup_started_on',
        'notes',
    ]

