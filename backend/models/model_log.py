import logging

from zephony.models import BaseModel, db
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB

logger = logging.getLogger(__name__)

class ModelLog(BaseModel):
    __tablename__ = 'model_logs'

    action = db.Column(db.String) # Create/Update/Delete
    record_id = db.Column(db.Integer)
    model_name = db.Column(db.String)
    order_id = db.Column(db.Integer)
    
    data = db.Column(JSONB, server_default=text("'{}'::jsonb"))
    previous_version = db.Column(JSONB, server_default=text("'{}'::jsonb"))
    current_version = db.Column(JSONB, server_default=text("'{}'::jsonb"))
    id_request_response_log = db.Column(
        db.Integer, db.ForeignKey(
            'request_response_logs.id', 
            name='fk_request_response_logs'
        )
    )

    readable_fields = [
        'action',
        'record_id',
        'order_id',
        'model_name',
        'data',
        'previous_version',
        'current_version',
    ]

