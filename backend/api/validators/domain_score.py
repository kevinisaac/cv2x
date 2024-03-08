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

create_domain_score_schema = Schema({
    Required('data'): {
        Required('score'): All(float, Range(min=0, max=10)),
        Required('score_date'): All(ValidDate()),

        Required('id_domain'): All(int, Range(min=1)),
        Required('id_domain_score_service'): All(int, Range(min=1)),
    }
})

update_domain_score_schema = Schema({
    Required('data'): {
        Optional('score'): All(float, Range(min=0, max=10)),
        Optional('score_date'): All(ValidDate()),

        Optional('id_domain'): All(int, Range(min=1)),
        Optional('id_domain_score_service'): All(int, Range(min=1)),
    }
})

