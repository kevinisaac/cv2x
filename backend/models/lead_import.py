import logging

from zephony.models import BaseModel, db
from zephony.helpers import random_string_generator
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

logger = logging.getLogger(__name__)


class LeadImport(BaseModel):
    __tablename__ = 'lead_imports'

    file_path = db.Column(db.String)
    original_file_name = db.Column(db.String)

    total_rows = db.Column(db.Integer)
    imported_rows_count = db.Column(db.Integer)

    checksum = db.Column(db.String)

    readable_fields = [
        'file_path',
        'original_file_name',
        'total_rows',
        'imported_rows_count',
        'checksum',
    ]

