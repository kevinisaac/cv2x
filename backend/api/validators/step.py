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


update_step_schema = Schema({
    Required('data'): {
        Optional('name'): All(ValidString(), Length(min=2, max=50)),
    }
})

