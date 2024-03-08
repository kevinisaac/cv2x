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

create_email_subscriber_schema = Schema({
    Required('data'): {
        Required('email'): All(ValidEmail()),
        Optional('name'): All(ValidString(), Length(min=0, max=300)),
        Required('first_name'): All(ValidString(), Length(min=0, max=300)),
        Optional('last_name'): All(ValidString(), Length(min=0, max=300)),
        Optional('source'): All(ValidString(), Length(min=0, max=100)),
        # Optional('source'): Any('website', 'linkedin', 'other'),
    },
})

update_email_subscriber_schema = Schema({
    Required('data'): {
        Optional('email'): All(ValidEmail()),
        Optional('name'): All(ValidString(), Length(min=0, max=300)),
        Optional('first_name'): All(ValidString(), Length(min=0, max=300)),
        Optional('last_name'): All(ValidString(), Length(min=0, max=300)),
        Optional('source'): Any('website', 'linkedin', 'other'),
    },
})

