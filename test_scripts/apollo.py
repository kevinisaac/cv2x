import copy
import requests
from urllib.parse import urlparse, parse_qs



cookies = {
    '_leadgenie_session': 'HxbGKASegogAfq0TW62RYoW1x7GRKpA2cPOFzriAhz%2FAwWFfWaVvNBhB6D%2FgiDbYBUjI9RiQni0ylBd02061e7Y80GnUl4roHcEcCK%2BSHEx7%2BbWLZdkmWXzAHm4lE96XzW4oXVEauG%2BcCX31reWHptWqJua1iZWizXJoAfYetpV2c%2BtuQFeN%2Flwp4yWiduSjRwxhMhmXU3nznUJB18KycS1nObDmA3WuyqBBCPk5peI6Z4x3yOHc2iItFk7Y7pDHl%2FCske9H8hNGyy3BUgFjpdnz1ahxmQieDcw%3D--hAbT1aoaveLwEv2u--8a8yWN4ueFbVHRrngxv9uA%3D%3D',
    'remember_token_leadgenie_v2': 'eyJfcmFpbHMiOnsibWVzc2FnZSI6IklqWTFZVGMzT1RZNVlUZGpNVFU0TURGak5tSmpOREprTTE5c1pXRmtaMlZ1YVdWamIyOXJhV1ZvWVhOb0lnPT0iLCJleHAiOiIyMDI0LTAyLTI2VDE3OjA2OjE5Ljk5OVoiLCJwdXIiOiJjb29raWUucmVtZW1iZXJfdG9rZW5fbGVhZGdlbmllX3YyIn19--e63166116b91687029f479d911df4afaa922aa0c',
}

headers = {
    'X-CSRF-TOKEN': '8wJeR6n_qDCY3KUiZe8bL93OioLeM2nS1QCXxPk-pThNocguM-FgF1ppGX92S13FLFJ87kMfU3mShm4woqzS2g',
}

apis = {
    'search': {
        'endpoint': 'https://app.apollo.io/api/v1/mixed_people/search',
        'payload': {
            # To be fetched from the browser URL
            'finder_view_id': None,
            'organization_industry_tag_ids': [],
            'person_locations': [],
            'person_titles': [],

            # Hardcoded
            'page': 4,
            'prospected_by_current_team': [
                'no'
            ],
            'display_mode': 'explorer_mode',
            'per_page': 25,
            'open_factor_names': [],
            'num_fetch_result': 1,
            'context': 'people-index-page',
            'show_suggestions': False,
        },
    },
    'get_emails': {
        'endpoint': 'https://app.apollo.io/api/v1/mixed_people/add_to_my_prospects',
        'payload': {
            # To be fetched from the search endpoint
            'entity_ids': [],

            # Hardcoded
            'skip_fetching_people': True,
        },
    },
}

def get_leads(browser_url='https://app.apollo.io/#/people?finderViewId=5b8050d050a3893c382e9360&organizationIndustryTagIds[]=5567cdd973696453d93f0000&page=2&personLocations[]=United%20States&personLocations[]=Canada&personTitles[]=founder&personTitles[]=cofounder&personTitles[]=ceo&personTitles[]=managing%20director'):
    url = apis['search']['endpoint']
    payload = copy.deepcopy(apis['search']['payload'])

    # Parse the URL to extract the query string
    parsed_url = urlparse(browser_url)
    query_string = parsed_url.fragment.split('?')[1]  # Extract the query part after '#'

    # Parse the query string to get the parameters
    params = parse_qs(query_string)
    # print(params)

    # Extract 'personLocations' parameter
    payload['person_locations'] = params.get('personLocations[]', [])
    payload['person_titles'] = params.get('personTitles[]', [])
    payload['organization_industry_tag_ids'] = params.get('organizationIndustryTagIds[]', [])
    payload['finder_view_id'] = params.get('finderViewId', [None])[0]

    # TEMP
    # return

    r = requests.post(url, json=payload, cookies=cookies, headers=headers)
    if r.status_code == 200:
        data = r.json()
        print(f'Returning {len(data["people"])} people..')

        persons_map = {}
        for person in data['people']:
            person = {
                'first_name': person['first_name'],
                'last_name': person['last_name'],
                'id': person['id'],
            }
            persons_map[person['id']] = person

        return persons_map

    elif 400 <= r.status_code < 500:
        print(f"Client error occurred: {r.status_code} {r.reason}")
    else:
        print(f"Server error occurred: {r.status_code} {r.reason}")


def get_emails(persons_map):
    url = apis['get_emails']['endpoint']
    payload = copy.deepcopy(apis['get_emails']['payload'])

    payload['entity_ids'] = list(persons_map.keys())

    r = requests.post(url, json=payload, cookies=cookies, headers=headers)
    if r.status_code == 200:
        data = r.json()

        for contact in data['contacts']:
            persons_map[contact['person_id']]['email'] = contact['email']
            print(persons_map[contact['person_id']]['first_name'])
            print(persons_map[contact['person_id']]['last_name'])
            print(persons_map[contact['person_id']]['email'])
            print('-----------')

        return persons_map

    elif 400 <= r.status_code < 500:
        print(f"Client error occurred: {r.status_code} {r.reason}")
    else:
        print(f"Server error occurred: {r.status_code} {r.reason}")


# persons_map = get_leads()
# get_emails(persons_map)

