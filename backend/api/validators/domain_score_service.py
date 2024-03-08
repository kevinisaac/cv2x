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

create_domain_score_service_schema = Schema({
    Required('data'): {
        Required('name'): All(ValidString(), Length(min=2, max=40)),
        Required('website'): All(ValidString(), Length(min=4, max=40)),
    }
})

update_domain_score_service_schema = Schema({
    Required('data'): {
        Optional('name'): All(ValidString(), Length(min=2, max=40)),
        Optional('website'): All(ValidString(), Length(min=4, max=40)),
    }
})

