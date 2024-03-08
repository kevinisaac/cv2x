import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class LeadBridgeStep(BaseModel):
    __tablename__ = 'leads_bridge_steps'

    entered_on = db.Column(db.DateTime)
    exited_on = db.Column(db.DateTime)

    external_job_started_on = db.Column(db.DateTime)
    external_job_completed_on = db.Column(db.DateTime)
    external_job_status = db.Column(db.String)
    external_job_requires_retry = db.Column(db.Boolean)

    id_lead = db.Column(
        db.Integer, db.ForeignKey('leads.id', name='fk_lead')
    )
    id_step = db.Column(
        db.Integer, db.ForeignKey('steps.id', name='fk_step')
    )
    id_user_entered_by = db.Column(
        db.Integer, db.ForeignKey('users.id', name='fk_user_entered_by')
    )

    readable_fields = [
        'entered_on',
        'exited_on',

        'external_job_started_on',
        'external_job_completed_on',
        'external_job_status',

        'id_lead',
        'id_step',
        'id_user_entered_by',
    ]

