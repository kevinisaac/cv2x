from voluptuous import (
    All,
    Any,
    Length,
    Schema,
    Optional,
    Required,
)

from zephony.validators import (
    AllowedPassword,
    ValidEmail,
    ValidDate,
    OnlyDigits,
    ValidString,
)

from . import (
    string_length_of_upto_50_characters,
)

# Schema to create a role
create_role_schema = Schema({
    Required('data'): {
        Required('name', msg='Name is required field'): All(
            ValidString(),
            string_length_of_upto_50_characters,
            msg='Name is required field',
        ),
        Optional('permission_bit_sequence'): All(OnlyDigits()),
    }
})

# Schema to update a role
update_role_schema = Schema({
    Required('data'): {
        Optional('name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('permission_bit_sequence'): All(OnlyDigits()),
    }
})

