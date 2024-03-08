import logging

from zephony.models import BaseModel, db
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB


logger = logging.getLogger(__name__)

class RequestResponseLog(BaseModel):
    __tablename__ = 'request_response_logs'

    status_code = db.Column(db.Integer)
    complete_url = db.Column(db.String)
    request_method = db.Column(db.String)
    request_uuid = db.Column(db.String)

    request_payload = db.Column(JSONB, server_default=text("'{}'::jsonb"))
    response_payload = db.Column(JSONB, server_default=text("'{}'::jsonb"))

    request_headers = db.Column(JSONB, server_default=text("'{}'::jsonb"))
    response_headers = db.Column(JSONB, server_default=text("'{}'::jsonb"))

    request_start_time = db.Column(db.DateTime(timezone=True), index=True)
    request_end_time = db.Column(db.DateTime(timezone=True), index=True)

    query_params = db.Column(JSONB, server_default=text("'{}'::jsonb"))

    def __init__(self, data):
        # Set `password` to None, if present in payload(Usually present while setting password).
        if data.get('request_payload') and data['request_payload'] and\
        'password' in data['request_payload'].get('data', {}) and\
        data['request_payload'].get('data', {}).get('password'):
            data['request_payload']['data']['password'] = '<This password is hidden>'

        # Set `new_password` to None, if present in payload(Usually present while updating password).
        if data.get('request_payload') and data['request_payload'] and\
        'new_password' in data['request_payload'].get('data', {}) and\
        data['request_payload'].get('data', {}).get('new_password'):
            data['request_payload']['data']['new_password'] = '<This new password is hidden>'

        # Set `Authorization` to None, if present in headers(Usually present is all JWT required routes).
        if data.get('request_headers') and data['request_headers'] and\
        'Authorization' in data['request_headers'] and data['request_headers']['Authorization']:
            data['request_headers']['Authorization'] = '<This JWT is hidden>'

        # Set `access_token` to None, if present in payload(Usually present in login response).
        if data.get('response_payload') and data['response_payload'] and\
        'data' in data['response_payload'] and data['response_payload'].get('data') and\
        'access_token' in data['response_payload'].get('data', {}) and\
        data['response_payload'].get('data', {}).get('access_token'):
            data['response_payload']['data']['access_token'] = '<This token is hidden>'
        super(RequestResponseLog, self).__init__(data)


    readable_fields = [
    ]

