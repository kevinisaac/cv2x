import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class CampaignBridgeLead(BaseModel):
    __tablename__ = 'campaigns_bridge_leads'

    id_campaign = db.Column(
        db.Integer, db.ForeignKey('campaigns.id', name='fk_campaigns')
    )
    id_lead = db.Column(
        db.Integer, db.ForeignKey('leads.id', name='fk_leads')
    )

    is_removed_from_campaign = db.Column(db.Boolean)
    removed_from_campaign_date = db.Column(db.DateTime)

