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


create_email_newsletter_schema = Schema({
    Required('data'): {
        Required('name'): All(ValidString(), Length(min=0, max=300)),
        Optional('description'): All(ValidString(), Length(min=0, max=3000)),
        Required('token'): All(ValidString(), Length(min=0, max=300)),
    },
})

update_email_newsletter_schema = Schema({
    Required('data'): {
        Optional('name'): All(ValidString(), Length(min=0, max=300)),
        Optional('description'): All(ValidString(), Length(min=0, max=3000)),
        Optional('token'): All(ValidString(), Length(min=0, max=300)),
    },
})

