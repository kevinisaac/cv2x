from voluptuous import (
    All,
    Any,
    Range,
    Length,
    Optional,
    Required,
)

from zephony.validators import (
    ValidInt,
    ValidDate,
    ValidEmail,
    ValidString,
    ValidBoolean,
    ValidAmount,
    ValidTime,
    OnlyDigits,
    ValidDateTime,
)

from ...json_data import json_data
from . import (
    date_length,
    time_length,
    phone_length,
    weekday_range,
    valid_foreign_key,
    value_greater_than_zero,
    string_length_of_upto_20_characters,
    string_length_of_upto_50_characters,
    string_length_of_upto_100_characters,
    string_length_of_upto_1000_characters,
    string_length_from_zero_upto_50_characters,
)

# Schema to create a address
address = {
    Optional('id_level_1_sub_division'): Any(
        None,
        All(
            ValidInt(), valid_foreign_key
        ),
    ),
    Optional('id_level_2_sub_division'): Any(
        None,
        All(
            ValidInt(), valid_foreign_key
        ),
    ),
    Optional('id_country'): Any(
        None,
        All(
            ValidInt(), valid_foreign_key
        ),
    ),
    Optional('id_city'): Any(
        None,
        All(
            ValidInt(), valid_foreign_key
        ),
    ),
    Optional('basic_info'): Any(
        None,
        All(
            ValidString(),
            string_length_from_zero_upto_50_characters,
        ),
    ),
    Optional('pincode'): Any(
        None,
        All(
            ValidString(),
            string_length_from_zero_upto_50_characters,
        ),
    ),
    Optional('locality'): Any(
        None,
        All(
            ValidString(),
            string_length_from_zero_upto_50_characters,
        ),
    ),
    Optional('landmark'): Any(
        None,
        All(
            ValidString(),
            string_length_from_zero_upto_50_characters,
        ),
    ),
}

update_address = {
    Optional('id'): All(
        ValidInt(), valid_foreign_key
    ),
    Optional('is_deleted'): Any(ValidBoolean()),
    Optional('id_level_1_sub_division'): Any(
        None,
        All(
            ValidInt(), valid_foreign_key
        ),
    ),
    Optional('id_level_2_sub_division'): Any(
        None,
        All(
            ValidInt(), valid_foreign_key
        ),
    ),
    Optional('id_country'): Any(
        None,
        All(
            ValidInt(), valid_foreign_key
        ),
    ),
    Optional('id_city'): Any(
        None,
        All(
            ValidInt(), valid_foreign_key
        ),
    ),
    Optional('basic_info'): Any(
        None,
        All(
            ValidString(),
            string_length_from_zero_upto_50_characters,
        ),
    ),
    Optional('pincode'): Any(
        None,
        All(
            ValidString(),
            string_length_from_zero_upto_50_characters,
        ),
    ),
    Optional('locality'): Any(
        None,
        All(
            ValidString(),
            string_length_from_zero_upto_50_characters,
        ),
    ),
    Optional('landmark'): Any(
        None,
        All(
            ValidString(),
            string_length_from_zero_upto_50_characters,
        ),
    ),
}

# Schema to create a phone
phone = {
    Optional('label_name'): All(
        ValidString(),
        string_length_of_upto_20_characters,
    ),
    Optional('phone_number'): Any(
        None,
        All(
            OnlyDigits(),
            phone_length,
        ),
    )
}

update_phone = {
    Optional('id'): All(
        ValidInt(), valid_foreign_key
    ),
    Optional('is_deleted'): Any(ValidBoolean()),
    Optional('label_name'): All(
        ValidString(),
        string_length_of_upto_20_characters,
    ),
    Optional('phone_number'): Any(
        None,
        All(
            OnlyDigits(),
            phone_length,
        ),
    )
}

alter_custom_fields = [{
    Required('id_field_type'): int,  # Semantic
    Required('value'): Any(  # Semantic
        int,
        str,
        [str],
        bool,
        ValidDate(),
    ),
}]