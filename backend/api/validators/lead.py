from voluptuous import (
    All,
    Any,
    Range,
    Length,
    Schema,
    Optional,
    Required,
)

from zephony.validators import (
    ValidInt,
    ValidDate,
    ValidDateTime,
    ValidEmail,
    ValidString,
    ValidBoolean,
    OnlyDigits,
)

from ...json_data import json_data
from .common_validation_schema import (
    address, phone, update_address, update_phone, alter_custom_fields
)
from . import (
    email_length,
    date_length,
    phone_length,
    valid_foreign_key,
    string_length_of_upto_20_characters,
    string_length_of_upto_50_characters,
    string_length_of_upto_100_characters,
    string_length_of_upto_1000_characters,
)

# Schema to create a lead
create_lead_schema = Schema({
    Required('data'): {
        Optional('title'): Any(*json_data['titles'].keys(), None),
        Required('first_name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Required('last_name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Required('name'): All(
            ValidString(),
            string_length_of_upto_100_characters,
        ),
        # Required('username'): All(
        #     ValidString(),
        #     string_length_of_upto_100_characters,
        # ),
        Optional('email'): All(
            ValidEmail(), email_length,
        ),
        Optional('phone'): All(
            OnlyDigits(), phone_length,
        ),
        Optional('first_sentence'): All(str, Length(min=1, max=400)),
        Optional('last_sentence'): All(str, Length(min=1, max=400)),

        Optional('id_designation'): All(
            ValidInt(), valid_foreign_key
        ),
        Required('id_company'): All(
            ValidInt(), valid_foreign_key
        ),
        Optional('linkedin_url'): All(
            ValidString(),
            string_length_of_upto_1000_characters,
        ),
        Optional('number_of_linkedin_connects'): All(
            ValidInt(),
        ),
        Optional('years_in_current_designation'): All(
            ValidInt(),
        ),
        Optional('ids_user'): All(
            [ValidInt()]
        ),
        Optional('address'): All(address),
        Optional('status'): Any(*json_data['lead_statuses'].keys()),
        Optional('step'): Any(*json_data['steps'].keys()),
        Optional('custom_fields'): All(alter_custom_fields),
        Optional('to_linkedin_connect_on'): Any(
            None, ValidDate()
        ),
        Optional('last_contacted_on'): Any(
            None, ValidDate()
        ),
        Optional('number_of_follow_ups'): Any(
            None, ValidInt()
        ),
        Optional('email_response_status'): Any(
            None, *json_data['email_response_statuses'].keys()
        ),
        Optional('id_industry'): All(
            ValidInt(), valid_foreign_key
        ),
        Optional('competitors'): All(
            ValidString(), string_length_of_upto_50_characters,
        ),
    }
})

# Schema to update a lead
update_lead_schema = Schema({
    Required('data'): {
        Optional('title'): Any(*json_data['titles'].keys(), None),
        Optional('first_name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('last_name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('name'): All(
            ValidString(),
            string_length_of_upto_100_characters,
        ),
        Optional('email'): All(
            ValidEmail(), email_length,
        ),
        Optional('phone'): All(
            OnlyDigits(), phone_length,
        ),
        Optional('first_sentence'): All(str, Length(min=1, max=400)),
        Optional('last_sentence'): All(str, Length(min=1, max=400)),
        Optional('notes'): All(str, Length(min=1, max=4000)),

        Optional('id_designation'): All(
            ValidInt(), valid_foreign_key
        ),
        Optional('id_industry'): All(
            ValidInt(), valid_foreign_key
        ),
        Optional('id_demo_design_picture'): Any(ValidInt(), valid_foreign_key),
        Optional('competitors'): All(
            str,
        ),
        Optional('id_company'): All(
            ValidInt(), valid_foreign_key
        ),
        Optional('linkedin_url'): All(
            ValidString(),
            string_length_of_upto_1000_characters,
        ),
        Optional('number_of_linkedin_connects'): All(
            ValidInt(),
        ),
        Optional('years_in_current_designation'): All(
            ValidInt(),
        ),
        Optional('ids_user'): All(
            [ValidInt()]
        ),
        Optional('address'): All(update_address),
        Optional('status'): Any(*json_data['lead_statuses'].keys()),
        Optional('step'): Any(*json_data['steps'].keys()),
        Optional('custom_fields'): All(alter_custom_fields),

        Optional('is_saved'): All(bool),
        Optional('is_unsubscribed'): All(bool),     # For unsubscribing manually
        Optional('to_linkedin_connect_on'): Any(
            None, ValidDate()
        ),
        Optional('last_contacted_on'): Any(
            None, ValidDate()
        ),
        Optional('number_of_follow_ups'): Any(
            None, ValidInt()
        ),
        Optional('email_response_status'): Any(
            None, *json_data['email_response_statuses'].keys()
        ),
        Optional('company'): {
            Optional('name'): All(ValidString(), string_length_of_upto_100_characters),
            Optional('short_name'): All(ValidString(), string_length_of_upto_50_characters),
            Optional('ultra_short_name'): All(ValidString(), string_length_of_upto_50_characters),
            Optional('description'): All(str),
            Optional('website_url'): All(
                ValidString(),
                string_length_of_upto_100_characters,
            ),
        },
    }
})

send_email_to_lead_schema = Schema({
    Required('data'): {
        Required('id_template'): All(int, Range(min=1)),
        Required('id_mail_account'): All(int, Range(min=1)),
    }
})

lead_activity_schema = Schema({
    Required('data'): Any({
        Required('action_type'): All(ValidString()),
        Optional('value'): Any(*json_data['exhibit_response_status'].keys()),
        Required('exhibit_app_url'): All(ValidString()),
    },
    {
        Required('action_type'): All(ValidString()),
        Required('exhibit_app_url'): All(ValidString()),
    })
})

