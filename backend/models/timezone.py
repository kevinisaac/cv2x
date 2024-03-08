import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class Timezone(BaseModel):
    __tablename__ = 'timezones'

    name = db.Column(db.String)
    short_name = db.Column(db.String)
    utc_offset = db.Column(db.String)

    readable_fields = [
        'name',
        'short_name',
        'utc_offset',
    ]

