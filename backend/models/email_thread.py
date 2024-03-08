import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class EmailThread(BaseModel):
    __tablename__ = 'email_threads'

    id_campaign_bridge_lead = db.Column(
        db.Integer,
        db.ForeignKey('campaigns_bridge_leads.id', name='fk_campaigns_bridge_leads'),
    )
    id_campaign_bridge_mail_account = db.Column(
        db.Integer,
        db.ForeignKey('campaigns_bridge_mail_accounts.id', name='fk_campaigns_bridge_mail_accounts'),
    )

    # To quickly filter emails by campaign
    id_campaign = db.Column(
        db.Integer, db.ForeignKey('campaigns.id', name='fk_campaigns')
    )

