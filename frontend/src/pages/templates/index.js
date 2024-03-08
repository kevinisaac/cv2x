import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { MeContext } from 'src/contexts';
import {
    Icon,
    Table,
    Header,
    Sidebar,
    ContactCTA,
} from 'src/components';
import {
    PageTopRow,
} from 'src/components/outreachComponents'

import {
    useCollection,
} from 'src/hooks';

import {
    getAge,
    getDayLabel,
    getGenderLabel,
} from 'src/helpers';
import moment from 'moment';

export default function TemplatesView(props) {
    const params =  new URL(window.location).searchParams;
    let navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const [ pageType, setPageType] = useState(params.get('status') === 'archived'
        ? 'archive-listing'
        : 'active-listing'
    );
    const [ columns, setColumns ]  = useState([
        {
            name: 'Name',
            id: 'name',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='template-name'>
                    {row.name}
                </div>
            }
        },
        {
            name: 'Subject',
            id: 'subject',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='template-subject'>
                    {'{{firstName}} - This is hard coded not from API'}
                    {/* {row.subject} */}
                </div>
            }
        },
        {
            name: 'Body',
            id: 'body',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                // let subjectDisplay;
                // let subject
                //     = 'Hi {{firstName}}, I just spoke to our CTO about {{companyName}} and we wanted to discuss the possibility of working together. We’re in the';
                return <div className='template-body'>
                    {row.body}
                </div>
            }
        },
        {
            name: 'Campaign',
            id: 'campaign',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let campaignList = [
                    {
                        name: 'Campaign 1',
                        started: true,
                    },
                    {
                        name: 'CEO Entrapment',
                    },
                ]
                let campaignListForDisplay = campaignList.map((campaign, index) => {
                    let className = '';
                    if (!campaign.started) {
                        className += ' campaign-not-started';
                    }

                    if (index !== (campaignList.length - 1)) {
                        className += ' add-comma';
                    }

                    return <span className={className}>
                        {campaign.name}
                    </span>
                })

                return <div className='campaign-details'>
                    {campaignList
                        ? campaignListForDisplay
                        : <span className='data-not-available'>Not added yet</span>
                    }
                </div>
            }
        },
        {
            name: 'Created by',
            id: 'created_by',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='creation-details'>
                    <div className='created-by'>
                        Aravind
                    </div>
                    <div className='created-on'>
                        {/* Started on {moment().format('DD MMM, YYYY')} */}
                        {moment(row.created_at).format('DD MMM, YYYY')}
                    </div>
                </div>
            }
        },
    ]);

    const [ templateC,
        updateTemplateC,
        templateRef,
        isTemplateRefVisible
    ] = useCollection(
        'templates',
        `status=${params.get('status')
            ? params.get('status')
            : 'active'}&page=1`
    );
    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

    function onRowClick(e, index) {
        e.preventDefault();
        console.log('Inside Row  Click');
        navigate(`/templates/${templateC.items[index].id}`)
    }

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'preferences.sidebarCollapsed') {
                setMainClassName(JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
                    ? ' expanded-view'
                    : ''
                )
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return <div id='main-grid' className={`${mainClassName}`}>
        <Header />
        <Sidebar />
        <div id='templates-view' className='app-content listing-view'>
            <PageTopRow
                title={pageType === 'archive-listing'
                    ? 'Archived Templates'
                    : 'Templates'
                }
                buttonText='Add Templates'
                onButtonClick={() => {
                    navigate('/templates/create');
                }}
                type={pageType}
                setType={setPageType}
                searchAttributes={{
                    suggestionsURL: 'templates',
                    suggestionsParams: pageType === 'active-listing'
                        ? 'status=active' : 'status=archived',
                    suggestionData: {
                        topLeft: {
                            values: [
                                {
                                    name: 'name',
                                },
                            ],
                        },
                    },
                    onSuggestionClick: (templateId) => {
                        navigate(`/templates/${templateId}`);
                    },
                    onMoreButtonClick: (qParam) => {
                        let urlSearchParams = new URLSearchParams(templateC.queryString);
                        urlSearchParams.set('q', qParam);
                        updateTemplateC({
                            queryString: urlSearchParams.toString(),
                        });
                    },
                }}
                collection={templateC}
                updateCollection={updateTemplateC}
            />
            <div className='page-content'>
                <Table
                    className='templates-table row-link'
                    data-test='templates-table'
                    items={templateC.items}
                    columns={columns}
                    controlColumns={[]}
                    loaded={templateC.loaded}
                    onRowClick={onRowClick}
                    tableEmptyText={pageType === 'archive-listing'
                        ? 'No archived templates'
                        : 'No templates added'
                    }
                    addNewRecordButtonText={pageType === 'archive-listing'
                        ? undefined
                        : 'Add template'
                    }
                    addNewRecordButtonURL='/templates/create'
                    collection={templateC}
                    updateCollection={updateTemplateC}
                    reference={templateRef}
                    queryString={templateC.queryString}

                    name='template'
                    setColumns={setColumns}
                    enableColumnPreference
                />
            </div>
        </div>
    </div>
}

