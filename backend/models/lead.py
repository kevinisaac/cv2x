import logging

from zephony.models import BaseModel, db
from zephony.helpers import random_string_generator
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

logger = logging.getLogger(__name__)


class Lead(BaseModel):
    __tablename__ = 'leads'

    username = db.Column(db.String, index=True, unique=True)     # Used for exhibit app account creation
    name = db.Column(db.String, index=True)
    first_name = db.Column(db.String, index=True)
    last_name = db.Column(db.String)
    email = db.Column(db.String, unique=True)
    email_status = db.Column(db.String)     # valid/invalid/unknown/accept_all_unverifiable
    email_status_updated_on = db.Column(db.Date)
    phone = db.Column(db.String)
    years_in_current_designation = db.Column(db.Integer)
    number_of_linkedin_connects = db.Column(db.Integer)
    status = db.Column(db.String, default='active')
    step = db.Column(db.String)
    notes = db.Column(db.String)

    linkedin_url = db.Column(db.String, index=True)
    to_linkedin_connect_on = db.Column(db.Date)

    last_contacted_on = db.Column(db.Date)
    number_of_follow_ups = db.Column(db.Integer)
    email_response_status = db.Column(db.String)

    first_sentence = db.Column(db.String)
    last_sentence = db.Column(db.String)

    instantly_email_sender = db.Column(db.String)
    competitors = db.Column(db.String)

    unsubscribe_token = db.Column(db.String)
    is_unsubscribed = db.Column(db.Boolean, default=False)
    unsubscription_date = db.Column(db.DateTime)
    unsubscribed_manually = db.Column(db.Boolean)    # If the user replied with something like "take me off your list"

    timezone = db.Column(db.String)

    custom_fields = db.Column(JSONB, default={})

    # If a lead failed on Scrubby for example, then the lead will be left here forever
    # Permanent failure - unless data is changed
    has_failed_on_step = db.Column(db.Boolean, default=False)
    failed_reason = db.Column(db.String)
    is_saved = db.Column(db.Boolean, default=False)

    # Use the foreign key below in the future instead of the plain text above
    id_failed_reason = db.Column(
        db.Integer,
        db.ForeignKey('failed_reasons.id', name='fk_failed_reasons'),
    )

    id_demo_design_picture = db.Column(db.Integer, db.ForeignKey('files.id', name='fk_files'))

    # External service attempts related
    apollo_person_id = db.Column(db.String, unique=True)
    id_apollo_lead_fetch_attempt = db.Column(
        db.Integer,
        db.ForeignKey('apollo_lead_fetch_attempts.id', name='fk_apollo_lead_fetch_attempts'),
    )
    id_apollo_email_fetch_attempt = db.Column(
        db.Integer,
        db.ForeignKey('apollo_email_fetch_attempts.id', name='fk_apollo_email_fetch_attempts'),
    )
    id_neverbounce_validation_attempt = db.Column(
        db.Integer,
        db.ForeignKey('neverbounce_validation_attempts.id', name='fk_neverbounce_validation_attempts'),
    )
    id_scrubby_validation_attempt = db.Column(
        db.Integer,
        db.ForeignKey('scrubby_validation_attempts.id', name='fk_scrubby_validation_attempts'),
    )
    id_instantly_push_attempt = db.Column(
        db.Integer,
        db.ForeignKey('instantly_push_attempts.id', name='fk_instantly_push_attempts'),
    )


    id_company = db.Column(
        db.Integer,
        db.ForeignKey('companies.id', name='fk_companies'),
    )
    id_designation = db.Column(
        db.Integer,
        db.ForeignKey('designations.id', name='fk_designations'),
    )
    id_address = db.Column(
        db.Integer,
        db.ForeignKey('addresses.id', name='fk_addresses'),
    )
    id_lead_import = db.Column(
        db.Integer,
        db.ForeignKey('lead_imports.id', name='fk_lead_imports'),
    )
    id_industry = db.Column(
        db.Integer,
        db.ForeignKey('industries.id', name='fk_industries'),
    )
    # The current step the lead is in
    id_step = db.Column(
        db.Integer,
        db.ForeignKey('steps.id', name='fk_steps'),
    )

    readable_fields = [
        'last_contacted_on',
        'number_of_follow_ups',
        'email_response_status',
        'email_status',
        'email_status_updated_on',

        'username',
        'name',
        'first_name',
        'last_name',
        'email',
        'phone',
        'step',
        'status',

        'is_saved',

        'linkedin_url',
        'to_linkedin_connect_on',

        'first_sentence',
        'last_sentence',
        'unsubscribe_token',

        'years_in_current_designation',
        'number_of_linkedin_connects',
        'custom_fields',

        'instantly_email_sender',
        'competitors',

        'id_lead_import',
        'id_industry',
        'id_demo_design_picture',

        'has_failed_on_step',
        'apollo_person_id',

        'notes',
    ]

    email_usable_fields = [
        'name',
        'username',
        'first_name',
        'last_name',

        'first_sentence',
        'last_sentence',

        'years_in_current_designation',
        'step',
    ]

    def __init__(self, data, from_seed_file=False):
        if 'custom_fields' in data and data['custom_fields']:
            custom_fields_map = {}
            for id_field_type, value in data['custom_fields'].items():
                custom_fields_map[id_field_type] = value
            data['custom_fields'] = custom_fields_map

        # Assign random unsubscription token
        data['unsubscribe_token'] = random_string_generator(10)

        # Use the super method to reuse the parent method
        super(Lead, self).__init__(data)

        if 'username' not in data:
            self.username = ''.join(
                each_char
                for each_char in self.name if each_char.isalnum()
            ).lower() + str(self.id_)

    def update(self, data):
        if 'custom_fields' in data and data['custom_fields']:
            custom_fields_map = self.custom_fields or {}
            for id_field_type, value in data['custom_fields'].items():
                custom_fields_map[str(id_field_type)] = value
            data['custom_fields'] = custom_fields_map

        # Use the super method to reuse the parent method
        super().update(data)

