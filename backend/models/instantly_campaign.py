import logging

from zephony.models import BaseModel, db
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


logger = logging.getLogger(__name__)

class InstantlyCampaign(BaseModel):
    __tablename__ = 'instantly_campaigns'

    name = db.Column(db.String)
    notes = db.Column(db.String)
    instantly_id = db.Column(db.String, unique=True)
    last_synced_on = db.Column(db.DateTime)
    accepts_leads = db.Column(db.Boolean)

    # Filled using Instantly's summary API
    summary = db.Column(JSONB)

    # Fields that are used in the Instantly template
    required_fields = db.Column(ARRAY(db.String))

    id_industry = db.Column(
        db.Integer, db.ForeignKey('industries.id', name='fk_industry')
    )

    readable_fields = [
        'name',
        'notes',
        'instantly_id',
        'last_synced_on',
        'id_industry',
        'accepts_leads',
        'summary',

        'required_fields',
    ]

