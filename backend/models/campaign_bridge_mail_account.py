import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class CampaignBridgeMailAccount(BaseModel):
    __tablename__ = 'campaigns_bridge_mail_accounts'

    id_campaign = db.Column(
        db.Integer,
        db.ForeignKey('campaigns.id', name='fk_campaigns'),
    )
    id_mail_account = db.Column(
        db.Integer,
        db.ForeignKey('mail_accounts.id', name='fk_mail_accounts'),
    )

    minimum_emails_per_day = db.Column(db.Integer)
    maximum_emails_per_day = db.Column(db.Integer)

    is_removed_from_campaign = db.Column(db.Boolean)
    removed_from_campaign_date = db.Column(db.DateTime)

    readable_fields = [
        'minimum_emails_per_day',
        'maximum_emails_per_day',
        'is_removed_from_campaign',
        'removed_from_campaign_date',
    ]

