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
import { request, } from 'src/helpers';

import {
    useCollection,
} from 'src/hooks';

import {
    formatAmount,
    getDayLabel,
    openURLInNewTab,
} from 'src/helpers';
import moment from 'moment';

export default function LeadImportsView(props) {
    const params =  new URL(window.location).searchParams;
    let navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const [ pageType, setPageType] = useState(params.get('status') === 'archived'
        ? 'archive-listing'
        : 'active-listing'
    );
    const [ columns, setColumns ]  = useState([
        {
            name: 'File Name',
            id: 'original_file_name',
            visible: true,
        },
        {
            name: 'Path',
            id: 'file_path',
            visible: true,
        },
        {
            name: 'Total Rows',
            id: 'total_rows',
            visible: true,
        },
        {
            name: 'Imported Row Count',
            id: 'imported_rows_count',
            sortable: 'backend',
            visible: true,
        },
        {
            name: 'Export',
            id: '#',
            sortable: 'backend',
            visible: true,
            render: (row) => <div className='export-file'>
                <button className='button primary-button'
                    onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();

                        request.download(`leads/-/export?id_lead_import=${row.id}`)
                            .then(async (response) => {
                                const blob = await response.blob();
                                // const blob = new Blob([response], {type : "application/pdf"});
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('target', '_blank');
                                link.click();
                            });
                    }}
                >
                    Export
                </button>
            </div>
        },
    ]);

    const [
        leadImportC,
        updateLeadImportC,
        leadImportRef,
        isLeadImportRefVisible
    ] = useCollection('leads/file-imports');
    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

    function onRowClick(e, index) {
        e.preventDefault();
    }

    useEffect(() => {
        const handleStorageChange = (e) => {
            // if (e.key === 'preferences.sidebarCollapsed' && e.newValue !== e.oldValue) {
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
        <div id='lead-imports-view' className='app-content listing-view'>
            <PageTopRow
                title='Lead Imports'
                collection={leadImportC}
                updateCollection={updateLeadImportC}
            />
            <div className='page-content'>
                <Table
                    className='lead-imports-table row-link'
                    data-test='lead-imports-table'
                    items={leadImportC.items}
                    columns={columns}
                    controlColumns={[]}
                    loaded={leadImportC.loaded}
                    onRowClick={onRowClick}
                    tableEmptyText='No lead imports'
                    collection={leadImportC}
                    updateCollection={updateLeadImportC}
                    reference={leadImportRef}
                    queryString={leadImportC.queryString}

                    name='leadImport'
                    setColumns={setColumns}
                    enableColumnPreference
                />
            </div>
        </div>
    </div>
}

