import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class UserBridgeLeadLinkedin(BaseModel):
    __tablename__ = 'users_bridge_leads_linkedin'

    id_user = db.Column(
        db.Integer, db.ForeignKey('users.id', name='fk_users')
    )
    id_lead = db.Column(
        db.Integer, db.ForeignKey('leads.id', name='fk_leads')
    )

    is_connected = db.Column(db.Boolean)
    connected_on = db.Column(db.DateTime)
    connection_last_verified_on = db.Column(db.DateTime)

    readable_fields = [
        'is_connected'
    ]