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

create_template_schema = Schema({
    Required('data'): {
        Required('name'): All(ValidString(), Length(min=5, max=50)),
        Required('title'): All(ValidString(), Length(min=2, max=100)),
        Required('body'): All(ValidString(), Length(min=2, max=10000)),
    }
})

update_template_schema = Schema({
    Required('data'): {
        Optional('name'): All(ValidString(), Length(min=5, max=50)),
        Optional('title'): All(ValidString(), Length(min=2, max=100)),
        Optional('body'): All(ValidString(), Length(min=2, max=10000)),
    }
})

