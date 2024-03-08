from voluptuous import (
    All,
    Optional,
    Required,
    Schema,
)

from zephony.validators import (
    ValidString,
)

from . import (
    string_length_of_upto_50_characters,
)

create_industry_schema = Schema({
    Required('data'): {
        Required('name', msg='Name is required field'): All(
            ValidString(),
            string_length_of_upto_50_characters,
            msg='Name is required field',
        ),
        Required('lowercase_for_template'): All(
            ValidString(),
            string_length_of_upto_50_characters,
            msg='Name is required field',
        ),
    }
})

update_industry_schema = Schema({
    Required('data'): {
        Optional('name'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
        Optional('lowercase_for_template'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
    }
})
