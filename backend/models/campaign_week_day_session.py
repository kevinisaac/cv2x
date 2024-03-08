import logging

from zephony.models import BaseModel, db

logger = logging.getLogger(__name__)


class CampaignWeekDaySession(BaseModel):
    __tablename__ = 'campaign_week_day_sessions'

    id_campaign = db.Column(
        db.Integer,
        db.ForeignKey('campaigns.id', name='fk_campaigns'),
    )

    week_day = db.Column(db.Integer, index=True)     # Monday = 0
    start_time = db.Column(db.Time, index=True)
    end_time = db.Column(db.Time, index=True)

    readable_fields = [
        'start_time',
        'end_time',
        'week_day',
    ]

