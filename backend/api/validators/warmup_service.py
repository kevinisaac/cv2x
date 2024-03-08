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

create_warmup_service_schema = Schema({
    Required('data'): {
        Required('name'): All(ValidString(), Length(min=2, max=40)),
    }
})

update_warmup_service_schema = Schema({
    Required('data'): {
        Optional('name'): All(ValidString(), Length(min=2, max=40)),
    }
})

