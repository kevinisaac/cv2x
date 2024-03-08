import logging

from zephony.models import BaseModel, db
from sqlalchemy.dialects.postgresql import INET

logger = logging.getLogger(__name__)


class EmailSubscriber(BaseModel):
    __tablename__ = 'email_subscribers'

    email = db.Column(db.String)

    name = db.Column(db.String)
    first_name = db.Column(db.String)
    last_name = db.Column(db.String)

    subscribed_on = db.Column(db.DateTime)
    unsubscribed_on = db.Column(db.DateTime)

    subscription_confirmed_on = db.Column(db.DateTime)
    status = db.Column(db.String)       # active/unsubscribed/pending
    source = db.Column(db.String)       # website/linkedin/etc.

    ip_address = db.Column(INET)

    id_company = db.Column(
        db.Integer,
        db.ForeignKey('companies.id', name='fk_companies'),
    )
    id_email_newsletter = db.Column(
        db.Integer,
        db.ForeignKey('email_newsletters.id', name='fk_email_newsletters'),
    )
    id_lead = db.Column(
        db.Integer,
        db.ForeignKey('leads.id', name='fk_leads'),
    )


    readable_fields = [
        'email',

        'name',
        'first_name',
        'last_name',

        'subscribed_on',
        'unsubscribed_on',

        'subscription_confirmed_on',
        'status',
        'source',

        'id_company',
        'id_email_newsletter',
        'id_lead',
        'ip_address',
    ]

