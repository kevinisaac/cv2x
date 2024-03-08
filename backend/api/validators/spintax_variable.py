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
    AllowedPassword,
    ValidEmail,
    ValidDate,
    OnlyDigits,
    ValidString,
)

create_spintax_variable_schema = Schema({
    Required('data'): {
        Required('name'): All(ValidString(), Length(min=0, max=100)),
        Required('spintax_variants'): [{
            Required('text'): All(ValidString(), Length(min=1, max=100)),
        }],

        Required('id_template'): All(int, Range(min=1)),
    }
})

update_spintax_variable_schema = Schema({
    Required('data'): {
        Optional('name'): All(ValidString(), Length(min=0, max=100)),
        Optional('spintax_variants'): [{
            Required('text'): All(ValidString(), Length(min=1, max=100)),
            Optional('id_'): All(int, Range(min=1)),
            Optional('is_deleted'): bool,
        }],
    }
})

