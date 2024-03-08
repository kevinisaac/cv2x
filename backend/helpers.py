import json

from zephony.models import db, BaseModel

def get_camelcase_string(string):
    if not string:
        return None

    return ''.join(
        [word.capitalize() for word in string.split('_')]
    )


def get_list_from_string(string, separator=','):
    items = string.strip().split(separator)
    return [ item.strip() for item in items ]


def get_boolean_from_string(value):
    if value is None:
        return None

    if value.lower() in ('yes', 'true', 'y', 'x', 't'):
        return True
    return False


def get_integer_from_string(string):
    return int(float(string)) if string else None


def get_json_from_string(value):
    if not value.strip():
        return None

    final = value.replace('\n', '')
    return json.loads(final)


# Accepts a list of resource objects compared to the initial version that
# accepts classes
def add_urls_new(blueprint, resources):
    """
    This function adds the URL rules of all the resources that is
    being passed as an argument list using Flask's add_url_rule method.
    This allows us to group requests and HTTP method handlers in
    objects with each method handler as a function.

    :param Blueprint blueprint: The blueprint to which the routes are
        to be attached
    :param list(object) resource_objects: The user defined resource objects
    """

    for resource in resources:
        functions = {
            'get_all': 'GET',
            'get': 'GET',
            'post': 'POST',
            'patch': 'PATCH',
            'put': 'PUT',
            'delete': 'DELETE',
        }

        for func, method in functions.items():
            if hasattr(resource, func):
                blueprint.add_url_rule(
                    resource.collection_route if func in ('get_all', 'post') else resource.resource_route,
                    f'{resource.object_type}_{func}',
                    view_func=getattr(resource, func),
                    methods=[method],
                )

