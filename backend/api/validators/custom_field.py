from voluptuous import (
    All,
    Any,
    Length,
    Optional,
    Required,
    Schema,
)


ALLOWED_FIELD_TYPES = [
    'int',
    'date',  # Eg: DOB
    # 'time',  # Not implementing temporarily
    'str',
    'single_line_text',
    'multi_line_text',
    'dropdown',
    'multi_choice_dropdown',
    'boolean',

    'url',
    'file_url',
    'media_url',
]

object_types = ['lead', 'company']

create_field_group_schema = Schema({
    Required('data') : {
        Required('name'): All(str, Length(min=1, max=40)),
        Optional('description'): All(str, Length(max=1000)),
        # Required('object_'): Any(*object_types),
        Required('id_object_type'): All(int),
    }
})

update_field_group_schema = Schema({
    Required('data') : {
        Required('name'): All(str, Length(min=1, max=40)),
        Optional('description'): All(str, Length(max=1000)),
        # Required('object_'): Any(*object_types),
    }
})

create_field_type_schema = Schema({
    Required('data'): {
        Required('name'): All(Length(min=1, max=40)),
        Optional('description'): All(str, Length(max=1000)),

        Required('type'): Any(*ALLOWED_FIELD_TYPES),
        Optional('is_required'): Any(bool),
        Optional('options'): {
            # Optional('required'): bool,

            Optional('min'): Any(str),  # Datetime, int, string
            Optional('max'): Any(str),
            # Optional('default'): Any(str, int),

            # Optional('choices'): All(
            #     [{
            #         Required('name'): All(str, Length(min=1, max=40)),
            #         Required('value'): All(str, Length(min=1, max=40)),
            #     }],
            #     Length(min=1),
            # )
            Optional('items'): All(
                [{
                    Required('name'): All(str, Length(min=1, max=40)),
                    Required('value'): All(str, Length(min=1, max=40)),
                }],
                Length(min=1),
            )
        },

        Required('id_field_group'): int,  # Semantic
    }
})

update_field_type_schema = Schema({
    Required('data'): {
        Optional('name'): All(Length(min=1, max=40)),
        Optional('description'): All(str, Length(max=1000)),

        Optional('type_'): Any(*ALLOWED_FIELD_TYPES),
        Optional('is_required'): Any(bool),
        Optional('options'): {
            # Optional('required'): bool,

            Optional('min'): Any(str, int),  # Datetime, int, string
            Optional('max'): Any(str, int),
            # Optional('default'): Any(str, int),

            # Optional('choices'): All(
            #     [{
            #         Required('name'): All(str, Length(min=1, max=40)),
            #         Required('value'): All(str, Length(min=1, max=40)),
            #     }],
            #     Length(min=1),
            # )
            Optional('items'): All(
                [{
                    Required('name'): All(str, Length(min=1, max=40)),
                    Required('value'): All(str, Length(min=1, max=40)),
                }],
                Length(min=1),
            )
        },
        Optional('id_field_group'): int,  # Semantic
    }
})

