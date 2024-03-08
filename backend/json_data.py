import json
import logging

from pprint import pprint
from flask import current_app as app

logger = logging.getLogger(__name__)

input_data_destination_path = 'data/json_data/input_data.json'
with open(input_data_destination_path, 'r') as data:
    dict_data = json.load(data)
    # pprint(dict_data)

    json_data = {
        'genders': {},
        'titles': {},
        'am_or_pm': {},
        'weekdays': {},
        'patterns': {},
        'religions': {},
        'referrals': {},
        'user_statuses': {},
        'client_statuses': {},
        'marital_statuses': {},
        'weekdays_for_rrule': {},
        'steps': {},
        'lead_statuses': {},
        'company_statuses': {},
        'email_response_statuses': {},
        'exhibit_response_status' : {},
    }

    for each_data in dict_data:
        if each_data in json_data:
            for each_dict in dict_data[each_data]:
                for key, value in each_dict.items():
                    if key == 'token':
                        json_data[each_data][value] = value

    # pprint(json_data)

# response_messages = {}

# # Work around populate data using file
# import csv
# translation_destination_path = 'data/exported_csv/translation.csv'
# with open(translation_destination_path, 'r') as translations_file:
#     translations = csv.reader(translations_file)

#     for index, each_translation in enumerate(translations):
#         if index != 0 and each_translation[1]:
#             response_messages[each_translation[1]] = each_translation[2]

# print('response_messages :', response_messages)
