import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Campaign(BaseModel):
    __tablename__ = 'campaigns'

    name = db.Column(db.String)
    notes = db.Column(db.String)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    status = db.Column(db.String)       # inactive/active/ended
    end_type = db.Column(db.String)     # abrupt/graceful

    id_user_started_by = db.Column(
        db.Integer, db.ForeignKey('users.id', name='fk_user_started_by')
    )

    id_user_ended_by = db.Column(
        db.Integer, db.ForeignKey('users.id', name='fk_user_ended_by')
    )

    id_exhibit_app = db.Column(
        db.Integer, db.ForeignKey('exhibit_apps.id', name='fk_exhibit_apps')
    )

    readable_fields = [
        'name',
        'notes',
        'start_date',
        'end_date',
        'end_type',
        'status',
        'is_deleted',
    ]

