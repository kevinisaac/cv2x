import logging

from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class ExhibitApp(BaseModel):
    __tablename__ = 'exhibit_apps'

    name = db.Column(db.String)
    url = db.Column(db.String)
    url_template = db.Column(db.String)
    status = db.Column(db.String)       # active/inactive


    readable_fields = [
        'name',
        'url',
        'url_template',
        'status',
    ]

