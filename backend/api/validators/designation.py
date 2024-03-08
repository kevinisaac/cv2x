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

create_designation_schema = Schema({
    Required('data'): {
        Required('name', msg='Name is required field'): All(
            ValidString(),
            string_length_of_upto_50_characters,
            msg='Name is required field',
        ),
    }
})

update_designation_schema = Schema({
    Required('data'): {
        Optional('name', msg='Name is required field'): All(
            ValidString(),
            string_length_of_upto_50_characters,
        ),
    }
})
