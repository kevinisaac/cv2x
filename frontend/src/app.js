import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
    Link,
    Route,
    Routes,
    redirect,
    Navigate,
    useNavigate,
    useLocation,
    BrowserRouter as Router,
} from 'react-router-dom';
import { transitions, positions, Provider as AlertProvider } from 'react-alert';
import {
    MatomoProvider,
    createInstance,
    useMatomo,
} from '@datapunt/matomo-tracker-react';
import * as Sentry from "@sentry/react";

import { Header, AlertTemplate, } from 'src/components';

import { request, copy } from 'src/helpers';
import { useToggle, useCollection } from 'src/hooks';

import { MeContext, CommonValueContext, UserPreferenceContext } from 'src/contexts';

import {
    LoginView,
    VerifyEmailView,
    SetPasswordView,
    ResetPasswordView,
} from 'src/pages/auth';

import LeadsView from 'src/pages/leads'
import LeadDetailsView from 'src/pages/leads/leadDetails'
import LeadImportsView from 'src/pages/leadImports'
import CampaignsView from 'src/pages/campaigns'
import CampaignDetailsView from 'src/pages/campaigns/campaignDetails'
import GmailView from 'src/pages/gmail'
import CompaniesView from 'src/pages/companies'
import CompanyDetailsView from 'src/pages/companies/companyDetails'
import DomainsView from 'src/pages/domains'
import DomainDetailsView from 'src/pages/domains/domainDetails'
import UsersView from 'src/pages/users'
import RolesView from 'src/pages/roles'
import SettingsView from 'src/pages/settings'
import AdminView from 'src/pages/admin'
import TemplateDetailsView from './pages/templates/templateDetails';

import NotFoundView from 'src/pages/notFound';

// Metadata related
import ListingView from 'src/metadata/listingPage';


// The main CSS bundle
import '../postcss/main.css';
import TemplatesView from './pages/templates';
import subscribersView from './pages/subscribers';
import SubscribersView from './pages/subscribers';


console.log(process.env.MATOMO_SITE_ID);
console.log(process.env.APP_ENV);

let matomoInstance;
if (process.env.MATOMO_SITE_ID) {
    matomoInstance = createInstance({
        urlBase: 'https://matomo.getpreview.io/',
        siteId: process.env.MATOMO_SITE_ID,

        // optional, default value: `undefined`.
        // userId: 'UID76903202',

        // optional, default value: `${urlBase}matomo.php`
        // trackerUrl: 'https://LINK.TO.DOMAIN/tracking.php',

        // optional, default value: `${urlBase}matomo.js`
        // srcUrl: 'https://LINK.TO.DOMAIN/tracking.js',

        // optional, false by default. Makes all tracking calls no-ops if set to true.
        disabled: process.env.MATOMO_SITE_ID ? false : true,

        // optional, enabled by default
        heartBeat: {
            active: true, // optional, default value: true
            seconds: 10 // optional, default value: `15
        },

        // optional, default value: true
        linkTracking: false,

        // optional, default value: {}
        configurations: {
            // any valid matomo configuration, all below are optional
            disableCookies: true,
            setSecureCookie: true,
            setRequestMethod: 'POST'
        }
    });

    // Sentry.init({
    //     dsn: 'https://8de275b6ca444084a8423735775b2746@o259394.ingest.sentry.io/4504752296951808',
    //     integrations: [
    //         new Sentry.BrowserTracing({
    //             // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
    //             // tracePropagationTargets: ['localhost', /^https:\/\/devpreview\.in/, /^https:\/\/getpreview\.io/],
    //             tracePropagationTargets: [/^https:\/\/sunassist\.devpreview\.in/, /^https:\/\/sunassist\.getpreview\.io/],
    //             // See docs for support of different versions of variation of react router
    //             // https://docs.sentry.io/platforms/javascript/guides/react/configuration/integrations/react-router/
    //             // routingInstrumentation: Sentry.reactRouterV6Instrumentation(
    //             // React.useEffect,
    //             // useLocation,
    //             // useNavigationType,
    //             // createRoutesFromChildren,
    //             // matchRoutes
    //             // ),
    //         }),
    //         new Sentry.Replay({
    //             maskAllText: false,
    //             maskAllInputs: false,
    //         }),
    //     ],
    //     environment: process.env.APP_ENV,
    //
    //     // Set tracesSampleRate to 1.0 to capture 100%
    //     // of transactions for performance monitoring.
    //     tracesSampleRate: 1.0,
    //
    //     // Capture Replay for 10% of all sessions,
    //     // plus for 100% of sessions with an error
    //     replaysSessionSampleRate: 0.1,
    //     replaysOnErrorSampleRate: 1.0,
    // });
}

// Optional alert cofiguration
const options = {
    position: positions.TOP_RIGHT,    // you can also just use 'bottom center'
    timeout: 5000,
    offset: '30px',
    transition: transitions.FADE,     // you can also just use 'scale'
}

function App() {
    const [ pages, setPages ] = useState([
        {
            path: '/login',
            requiresAuth: false,
            component: LoginView,
            title: 'Login - Outreach',
            heading: 'Log in to continue',
        },
        {
            path: '/set-password',
            requiresAuth: false,
            component: SetPasswordView,
            title: 'Set Password - Outreach',
            heading: 'Set your password',
        },
        {
            path: '/reset-password',
            requiresAuth: false,
            component: ResetPasswordView,
            title: 'Reset Password - Outreach',
            heading: 'Reset your password',
        },
        {
            path: '/verify-email',
            requiresAuth: false,
            component: VerifyEmailView,
            title: 'Verify email - Outreach',
            heading: 'Verify your email',
        },
        {
            path: '/',
            requiresAuth: true,
            redirectTo: '/leads',
        },
        {
            path: '/leads',
            requiresAuth: true,
            component: LeadsView,
            title: 'Leads - Outreach',
            heading: 'Leads',
        },
        {
            path: '/leads/:id',
            requiresAuth: true,
            component: LeadDetailsView,
            title: 'Lead View - Outreach',
            heading: 'Lead View',
        },
        {
            path: '/lead-imports',
            requiresAuth: true,
            component: LeadImportsView,
            title: 'Leads Imports - Outreach',
            heading: 'Leads Imports',
        },
        {
            path: '/campaigns',
            requiresAuth: true,
            component: CampaignsView,
            title: 'Campaigns - Outreach',
            heading: 'Campaigns',
        },
        {
            path: '/campaigns/:id',
            requiresAuth: true,
            component: CampaignDetailsView,
            title: 'Campaign View - Outreach',
            heading: 'Campaign View',
        },
        {
            path: '/gmail',
            requiresAuth: true,
            component: GmailView,
            title: 'Gmail - Outreach',
            heading: 'Gmail',
        },
        {
            path: '/domains',
            requiresAuth: true,
            component: DomainsView,
            title: 'Domains - Outreach',
            heading: 'Domains',
        },
        {
            path: '/domains/:id',
            requiresAuth: true,
            component: DomainDetailsView,
            title: 'Domain View - Outreach',
            heading: 'Domain View',
        },
        {
            path: '/companies',
            requiresAuth: true,
            component: CompaniesView,
            title: 'Companies - Outreach',
            heading: 'Companies',
        },
        {
            path: '/companies/:id',
            requiresAuth: true,
            component: CompanyDetailsView,
            title: 'Company View - Outreach',
            heading: 'Company View',
        },
        {
            path: '/users',
            requiresAuth: true,
            component: UsersView,
            title: 'Users - Outreach',
            heading: 'Users',
        },
        {
            path: '/roles',
            requiresAuth: true,
            component: RolesView,
            title: 'Roles - Outreach',
            heading: 'Roles',
        },
        {
            path: '/settings',
            requiresAuth: true,
            component: SettingsView,
            title: 'Profile Settings - Outreach',
            heading: 'Profile Settings',
        },
        {
            path: '/admin',
            requiresAuth: true,
            component: AdminView,
            title: 'Admin - Outreach',
            heading: 'Admin',
        },
        {
            path: '/templates',
            requiresAuth: true,
            component: TemplatesView,
            title: 'Templates - Outreach',
            heading: 'Templates',
        },
        {
            path: '/templates/:id',
            requiresAuth: true,
            component: TemplateDetailsView,
            title: 'Templates - Outreach',
            heading: 'Templates',
        },
        {
            path:'/subscribers',
            requiresAuth: true,
            component: SubscribersView,
            title: 'Newsletter Subscribers',
            heading: 'Newsletter Subscribers'
        },
    ])

    const [
        metadataPageC,
        updateMetadataPageC,
    ] = useCollection('metadata_pages')

    useEffect(() => {
        if (metadataPageC.items.length > 0) {
            setPages(old => {
                let new_ = [...old]
                let new_pages = metadataPageC.items.filter(item => item.type=='list').map(page => ({
                    path: `/${page.url}`,
                    requiresAuth: true,
                    component: ListingView,
                    title: `${page.title} - Outreach`,
                    heading: page.name,
                    metadata: page,
                }))
                new_.push(...new_pages)

                return new_
            })
        }
    }, [ metadataPageC.items ])

    return <AlertProvider template={AlertTemplate} {...options}>
        <Router>
            {/* Generic routes */}
            <Routes>
                {/* 404 route */}
                <Route path='*' element={<NotFoundView />} />

                {/* All the pages */}
                {pages.map(page => {
                    return <Route
                        key={page.path}
                        path={page.path}
                        element={<ElementWrapper
                            path={page.path}
                            title={page.title}
                            requiresAuth={page.requiresAuth}
                            component={page.component}
                            redirectTo={page.redirectTo}
                            heading={page.heading}
                            metadata={page.metadata}
                        />}
                    />
                })}
            </Routes>
        </Router>
    </AlertProvider>
}


function RequireAuth(props) {
    const navigate = useNavigate();
    const location_ = useLocation();

    const [ me, setMe ] = useState({
        name: '',
        email: '',
        preferred_date_format: null,
        permissions_map: {},
    });
    const [ commonData, setCommonData ] = useState();

    const [ isSubMenuCollapsed, setIsSubMenuCollapsed ] = useState(
        JSON.parse(localStorage.getItem('preferences.subMenuCollapsed'))
    );
    function toggleSubMenu() {
        setIsSubMenuCollapsed(old => {
            let new_ = !old;
            localStorage.setItem('preferences.subMenuCollapsed', new_);

            return new_;
        });
    }

    useEffect(() => {
        request.get('me')
            .then(([status_, data]) => {
                //Check to see if we have preferred columns for all tabl

                setMe(data.data);
            }).
            catch(() => {
                console.log('Unable to fetch logged in user details');
            })
        ;

        // request.get('input-data')
        //     .then(([status_, response]) => {
        //         setCommonData(response.data);
        //         console.log();
        //     })
        // ;

        request.get('countries')
            .then(([status_, response]) => {
                setCommonData({countries: response.data, ...commonData});
            })
        ;
        request.get('level-1-sub-divisions')
            .then(([status_, response]) => {
                setCommonData({level_1_sub_divisions: response.data, ...commonData});
            })
        ;
        request.get('level-2-sub-divisions')
            .then(([status_, response]) => {
                setCommonData({level_2_sub_divisions: response.data, ...commonData});
            })
        ;
        request.get('cities')
            .then(([status_, response]) => {
                setCommonData({cities: response.data, ...commonData});
            })
        ;

    }, []);

    if (!localStorage.getItem('jwt')) {
        // console.log('No JWT set');
        navigate('/login');
        return <Navigate to='/login' state={{ from: location_ }} />
    }

    return <MeContext.Provider value={{me, setMe}}>
        <CommonValueContext.Provider value={{commonData}}>
            <UserPreferenceContext.Provider
                value={{isSubMenuCollapsed, toggleSubMenu}}
            >
                {props.children}
            </UserPreferenceContext.Provider>
        </CommonValueContext.Provider>
    </MeContext.Provider>
}


function ElementWrapper(props) {
    const location_ = useLocation();
    const { trackPageView, trackEvent } = useMatomo();

    useEffect(() => {
        if (props.redirectTo) {
            return
        }

        // To scroll page to the top and to set the page title
        document.title = props.title;
        window.scrollTo(0, 0);

        // Track page view with Matomo
        trackPageView();
    }, [ props.path ])

    useEffect(() => {
        console.log('Location', location_, location_.pathname.includes('/bookings/'));
        let url = location_.pathname;
        let queryParams = new URLSearchParams(location_.search);
        if (queryParams.toString()){
            url += '?' + queryParams.toString();
        }

        if (!(location_.pathname.includes('/bookings/'))) {
            localStorage.setItem('prevURL', url);
        }
    }, [location_]);

    if (props.redirectTo) {
        console.log('Redirecting..');
        return <Navigate to={props.redirectTo} />
        console.log('After..');
    }

    if (props.requiresAuth) {
        return <RequireAuth>
            <props.component
                heading={props.heading}
                metadata={props.metadata}
            />
        </RequireAuth>
    }

    return <props.component
        heading={props.heading}
        metadata={props.metadata}
    />
}


const container = document.querySelector('#root');
const root = createRoot(container);

root.render(
    <MatomoProvider value={matomoInstance || null}>
        <App />
    </MatomoProvider>
);

