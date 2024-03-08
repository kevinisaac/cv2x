import React, { useState, useEffect } from 'react';
import { Link, } from 'react-router-dom';

import {
    Icon,
    Input,
    Table,
    Button,
    Header,
    Sidebar,
    ContactCTA,
    PageTopRow,
} from 'src/components';


export default function BookingDetailsView(props) {
    const sections = [
        {
            name: 'Basic Details',
            icon: null,
            navigation: 'basic-details',
            subSections: [
                {
                    name: null,
                    componentView: <BasicDetailsPrimary />
                }
            ]
        },
        {
            name: 'Demographic',
            icon: null,
            navigation: 'demographic',
            subSections: [
                {
                    name: null,
                    componentView: <BasicDetailsPrimary />
                }
            ]
        },
        {
            name: 'Episode',
            icon: null,
            navigation: 'episode',
            subSections: [
                {
                    name: null,
                    componentView: <BasicDetailsPrimary />
                }
            ]
        },
        {
            name: 'Statistics',
            icon: null,
            navigation: 'statistics',
            subSections: [
                {
                    name: null,
                    componentView: <BasicDetailsPrimary />
                }
            ]
        },
        {
            name: 'Danger Zone',
            icon: 'danger-circle.svg',
            type: 'danger',
            navigation: 'danger-zone',
            subSections: [
                {
                    name: null,
                    componentView: <BasicDetailsPrimary />
                }
            ]
        },
    ]

    return <div id='main-grid'>
        <Header />
        <Sidebar />
        <div id='booking-details-view' className='app-content'>
            <PageTopRow
                title='Marcus Shield'
                backButtonURL='/bookings'
            />
            <div className='page-content'>
                <div className='left-page-content'>
                    <NavigationPanel sections={sections} />
                    <VersionHistory />
                </div>
                <div className='right-page-content'>
                    <Sections sections={sections} />
                </div>
            </div>
        </div>
    </div>
}

function NavigationPanel(props) {
    return <div className='navigation-panel'>
        {props.sections.map(section => <a href={`#${section.navigation}`} className='section-link'>
            <div className='section-icon'>
                {section.icon && <Icon path={section.icon} size={13} />}
            </div>
            {section.type === 'danger' && <div
                className='link-text danger-link'
            >
                {section.name}
            </div>}
            {section.type !== 'danger' && <div
                className='link-text'
            >
                {section.name}
            </div>}

        </a>)}
    </div>
}

function VersionHistory(props) {
    return <div className='version-history'>
    <div className='title'>Previous Versions</div>
    <div className='version-list'>
        <Link className='previous-version'>
            Item 1
        </Link>
        <Link className='previous-version'>
            Item 2
        </Link>
        <Link className='previous-version'>
            Item 3
        </Link>
    </div>
</div>
}

function Sections(props) {
    return <div className='sections'>
        {props.sections.map(section => <Section
            title={section.name}
            navigation={section.navigation}
        />)}
    </div>
}

function Section(props) {
    return  <div className='section'>
        <span id={props.navigation} className='section-anchor'/>
        <div className='section-title'>{props.title}</div>
        <div className='section-content'>
            <SubSection>
                <div>Name</div>
            </SubSection>

            <SubSection title='Contact Details'>
                <div>Contact Details</div>
            </SubSection>
        </div>
    </div>
}

function SubSection(props) {
    return <div className='sub-section'>
        {props.title && <div className='sub-section-title'>{props.title}</div>}
        <div className='sub-section-content'>
            {props.children}
        </div>
    </div>
}

function BasicDetailsPrimary(props) {
    return <div className='basic-details-primary'>
        <h1>Content</h1>
    </div>
}

