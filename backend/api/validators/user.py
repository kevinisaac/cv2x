from voluptuous import (
    All,
    Any,
    Length,
    Schema,
    Optional,
    Required,
)

from zephony.validators import (
    ValidInt,
    ValidEmail,
    ValidDate,
    ValidTime,
    ValidString,
    ValidBoolean,
    ValidDateTime,
    AllowedPassword,
)

from ...json_data import json_data
from . import (
    time_length,
    date_length,
    email_length,
    phone_length,
    password_length,
    datetime_length,
    valid_foreign_key,
    string_length_of_upto_50_characters,
)

login_schema = Schema({
    Required('data'): {
        Required('email'): All(ValidString()),
        Required('password'): All(ValidString()),
    }
})

verify_password = Schema({
    Required('data'): {
        Required('password'): All(AllowedPassword()),
    }
})

update_email_or_password = Schema({
    Required('data'): {
        Optional('new_email'): All(ValidEmail(), email_length),
        Optional('new_password'): All(AllowedPassword(), password_length),
        Required('password'): All(AllowedPassword(), password_length),
    }
})

# Schema to send password reset link
forgot_password_schema = Schema({
    Required('data'): {
        Required('email'): All(ValidEmail()),
    }
})

# Schema to send password reset link
confirm_new_email_schema = Schema({
    Required('data'): {
        Required('new_email'): All(ValidEmail(), email_length),
        Required('new_email_verification_token'): All(ValidString()),
    }
})

# Schema to reset password using the password reset link
reset_password_schema = Schema({
    Required('data'): {
        Required('email'): All(ValidEmail(), email_length),
        Required('password_reset_token'): All(ValidString()),
        Required('password'): All(AllowedPassword(), password_length),
    }
})

# Schema to set password using the password reset link
set_password_schema = Schema({
    Required('data'): {
        Required('email'): All(ValidEmail(), email_length,),
        Required('password_set_token'): All(ValidString()),
        Required('password'): All(AllowedPassword(), password_length),
    }
})

# Schema to resend invite to user
resend_invite_to_user_schema = Schema({
    Required('data'): {
        Required('email'): All(ValidEmail())
    }
})

# Schema to create a user
create_a_user_schema = Schema({
    Required('data'): {
        Required('email', msg='Email is required field'): All(
            ValidEmail(), email_length, msg='Please enter a valid email',
        ),
        Required('name', msg='Name is required field'): All(
            ValidString(),
            string_length_of_upto_50_characters,
            msg='Please enter a valid name',
        ),
        Optional('id_role'): Any(
            None,
            All(ValidInt(), valid_foreign_key),
        ),
        Optional('is_admin'): Any(ValidBoolean()),
    }
})

# Schema to update a user
update_a_user_schema = Schema({
    Required('data'): {
        Optional('name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('email'): All(ValidEmail(), email_length,),
        Optional('id_role'): Any(
            None,
            All(ValidInt(), valid_foreign_key),
        ),
        Optional('id_profile_picture'): Any(ValidInt(), None),
        Optional('preferred_date_format'): Any(
            None,
            All(ValidString(), date_length),
        ),
        Optional('preferred_time_format'): Any(
            None,
            All(ValidString(), time_length),
        ),
        Optional('is_admin'): All(ValidBoolean()),
        Optional('status'): Any(*json_data['user_statuses'].keys()),
        Optional('datetime_joined_at'): All(ValidDateTime(), datetime_length),
    }
})

update_my_account_schema = Schema({
    Required('data'): {
        Optional('name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('id_profile_picture'): Any(ValidInt(), None),
        Optional('preferred_date_format'): Any(ValidString(), date_length),
        Optional('preferred_time_format'): Any(ValidString(), time_length),
        Optional('preferred_columns'): Any(dict, {}),
    }
})
