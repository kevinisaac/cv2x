from voluptuous import (
    All,
    Any,
    Optional,
    Required,
    Schema,
)

from zephony.validators import (
    ValidInt,
    ValidString,
    ValidDate,
)

from . import (
    date_length,
    string_length_of_upto_50_characters,
    string_length_of_upto_100_characters,
)

from ...json_data import json_data
from .common_validation_schema import (
    address, update_address, alter_custom_fields
)

create_company_schema = Schema({
    Required('data'): {
        Required('name', msg='Name is required field'): All(
            ValidString(),
            string_length_of_upto_50_characters,
            msg='Name is required field',
        ),
        Optional('website_url'): All(
            ValidString(),
            string_length_of_upto_100_characters,
        ),
        Optional('description'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('short_name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('ultra_short_name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('founded_year'): All(
            ValidInt(),
        ),
        Optional('employee_count'): All(
            ValidInt(),
        ),
        Optional('employee_count_min'): All(
            ValidInt(),
        ),
        Optional('employee_count_max'): All(
            ValidInt(),
        ),
        Optional('annual_revenue'): All(
            ValidInt(),
        ),
        Optional('annual_revenue_min'): All(
            ValidInt(),
        ),
        Optional('annual_revenue_max'): All(
            ValidInt(),
        ),
        Optional('custom_fields'): All(alter_custom_fields),
        Optional('id_industry'): All(
            ValidInt(),
        ),
        Optional('id_company_type'): All(
            ValidInt(),
        ),
        Optional('ids_specialization'): All(
            [ValidInt()]
        ),
        Optional('address'): All(address),
        Optional('status'): Any(*json_data['company_statuses'].keys()),
    }
})

update_company_schema = Schema({
    Required('data'): {
        Optional('name', msg='Name is required field'): All(
            ValidString(),
            string_length_of_upto_50_characters,
            msg='Name is required field',
        ),
        Optional('website_url'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('description'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('short_name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('ultra_short_name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('founded_year'): All(
            ValidInt(),
        ),
        Optional('employee_count'): All(
            ValidInt(),
        ),
        Optional('employee_count_min'): All(
            ValidInt(),
        ),
        Optional('employee_count_max'): All(
            ValidInt(),
        ),
        Optional('annual_revenue'): All(
            ValidInt(),
        ),
        Optional('annual_revenue_min'): All(
            ValidInt(),
        ),
        Optional('annual_revenue_max'): All(
            ValidInt(),
        ),
        Optional('custom_fields'): All(alter_custom_fields),
        Optional('id_industry'): All(
            ValidInt(),
        ),
        Optional('id_company_type'): All(
            ValidInt(),
        ),
        Optional('ids_specialization'): All(
            [ValidInt()]
        ),
        Optional('address'): All(update_address),
        Optional('status'): Any(*json_data['company_statuses'].keys()),
    }
})
