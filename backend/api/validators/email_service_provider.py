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

create_email_service_provider_schema = Schema({
    Required('data'): {
        Required('name'): All(ValidString(), Length(min=5, max=50)),
    }
})

update_email_service_provider_schema = Schema({
    Required('data'): {
        Optional('name'): All(ValidString(), Length(min=5, max=50)),
    }
})

