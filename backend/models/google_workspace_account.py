import json
import logging

from sqlalchemy.dialects.postgresql import JSONB
from zephony.models import BaseModel, db


logger = logging.getLogger(__name__)

class GoogleWorkspaceAccount(BaseModel):
    __tablename__ = 'google_workspace_accounts'

    email = db.Column(db.String)
    notes = db.Column(db.Text)
    credentials = db.Column(JSONB, default={})

    readable_fields = [
        'email',
        'notes',
    ]

    def __init__(self, data, from_seed_file=False):
        # Load the credentials JSON from the JSON file if available
        domain = data['email'].split('@')[1]
        file_path = f'secrets/{domain}-credentials.json'

        try:
            with open(file_path, 'r') as file:
                credentials_dict = json.load(file)
                data['credentials'] = credentials_dict
                ic(credentials_dict)
        except FileNotFoundError:
            print(f"The file '{file_path}' does not exist")
        except json.JSONDecodeError:
            print(f"The file '{file_path}' does not contain valid JSON data")


        # Use the super method to reuse the parent method
        super(GoogleWorkspaceAccount, self).__init__(data)

