import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class CampaignBridgeTemplate(BaseModel):
    __tablename__ = 'campaigns_bridge_templates'

    id_campaign = db.Column(
        db.Integer, db.ForeignKey('campaigns.id', name='fk_campaigns')
    )
    id_template = db.Column(
        db.Integer, db.ForeignKey('templates.id', name='fk_templates')
    )

    is_removed_from_campaign = db.Column(db.Boolean)
    removed_from_campaign_date = db.Column(db.DateTime)

    order = db.Column(db.Integer)
    delay = db.Column(db.Integer)
    delay_unit = db.Column(db.Integer)  # minute/hour/day

    readable_fields = [
        'is_removed_from_campaign',
        'removed_from_campaign_date',
    ]

