import React, { useState, useEffect, useContext } from 'react';
import { useAlert } from 'react-alert';

import { MeContext } from 'src/contexts';
import {
    Icon,
    Table,
    Button,
    Modal,
    Header,
    Sidebar,
    ContactCTA,
} from 'src/components';
import {
    Input,
    SelectField,
} from 'src/components/form';
import { PageTopRow, } from 'src/components/outreachComponents';
import { useCollection, useToggle, useForm } from 'src/hooks';
import { copy, request, getOptions, removeEmptyKeys } from 'src/helpers';

const initUserForm = {
    data: {
        email: '',
        name: '',
        is_admin: false,
        id_role: 1,
        id: null,
    }
}

export default function UsersView(props) {
    const alert_ = useAlert();
    const { me, setMe } = useContext(MeContext);
    const [ columns, setColumns ]  = useState([]);
    const [ originalFormData, setOriginalFormData ] = useState(null);
    const [ viewMode, setViewMode ] = useState('read'); //edit/read
    const [ modalType, setModalType ] = useState('create'); //create/update
    const [ userModal, toggleUserModal ] = useToggle(false);
    const [
        userForm,
        setUserForm,
        onUserChange,
        userError,
        setUserError,
    ] = useForm(initUserForm);

    const [ userC,
        updateUserC,
        userRef,
    ] = useCollection('users');
    const [ roleC, updateRoleC ] = useCollection('roles');
    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

    let roles = [{name: 'Admin \u2B50', value: 'super_admin'}];
    if (roleC.loaded){
        roles = roles.concat(getOptions(roleC.items, 'name', 'id'));
    }
    // console.log('##Roles', roles);

    function onRowClick(e, index) {
        e.preventDefault();

        //Check for update user permission
        if (!me.permissions_map?.update_user) {
            return;
        }
        let formData = convertUserDataToForm(userC.items[index]);
        setUserForm(formData);

        setViewMode('read');
        setModalType('update');
        toggleUserModal();
    }

    function convertUserDataToForm(user) {
        //Set to orignal user as that is more similar to the final request object
        let formData = {
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                id_role: user.role_details?.id ?? null,
            }
        };

        if (user.is_admin) {
            formData.data.id_role = 'super_admin';
        }
        setOriginalFormData(formData);

        return formData;
    }

    function convertFormDataToRequest(formData) {
        let requestData = copy(formData);
        delete requestData.data.id;
        //TODO: Add code to fetch only keys which changed

        if (requestData.data.id_role === 'super_admin') {
            delete requestData.data.id_role;

            requestData.data['is_admin'] = true;
        }

        return requestData;
    }

    function activateUser(e, userId) {
        e.preventDefault();
        let requestData = {
            data: {
                'status': 'active',
            }
        }

        request.patch(`users/${userId}`, requestData)
            .then(([status_, response]) => {
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('User activated');
                }
                updateUserC({
                    reload: true,
                });
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while activating. Please try again.');
                }
            });
    }

    function resendActivationEmail(e, emailId) {
        e.preventDefault();
        let requestData = {
            data: {
                email: emailId,
            }
        }

        request.post(`resend-invite`, requestData)
            .then(([status_, response]) => {
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Activation email sent successfully');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while sending. Please try again.');
                }
            });
    }

    function deactivateUser(e, userId){
        e.preventDefault();
        let requestData = {
            data: {
                'status': 'deactivated',
            }
        }

        request.patch(`users/${userId}`, requestData)
            .then(([status_, response]) => {
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('User deactivated');
                }
                updateUserC({
                    reload: true,
                });
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while deactivating. Please try again.');
                }
            });
    }

    function createUser() {
        let requestData = convertFormDataToRequest(userForm);

        request.post(`users`, requestData)
            .then(([status_, response]) => {
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('User added');
                }
                updateUserC({
                    reload: true,
                });
                toggleUserModal();
                setUserError([]);
            })
            .catch(([errorStatus, response]) => {
                setUserError(response.errors);
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while adding user. Please try again.');
                }
            });
    }

    function updateUser() {
        let requestData = convertFormDataToRequest(userForm);

        request.patch(`users/${userForm.data.id}`, requestData)
            .then(([status_, response]) => {
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('User Updated');
                }
                updateUserC({
                    reload: true,
                });
                toggleUserModal();
                setUserError([]);
            })
            .catch(([errorStatus, response]) => {
                setUserError(response.errors);
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error updating user. Contact admin.');
                }
            });
    }

    useEffect(() => {
        // if (Object.keys(me?.permissions_map).length > 0) {
            setColumns([
                {
                    name: 'ID',
                    id: 'id_',
                    visible: true,
                    sortable: 'backend',
                    render: (row) => {
                        return <div className='user-id'>
                            {row.id}
                        </div>
                    }
                },
                {
                    name: 'User',
                    id: 'name',
                    visible: true,
                    sortable: 'backend',
                    render: (row) => {
                        return <div className='user'>
                            <div className='user-name'>
                                {row.name}
                            </div>
                            <div className='user-email'>
                                {row.email}
                            </div>
                        </div>
                    }
                },
                {
                    name: 'Role',
                    id: 'role_details.name',
                    visible: true,
                    render: (row) => {
                        let roleName;

                        if (row.is_admin) {
                            roleName = <>
                                <span>Admin</span>
                                <span>
                                    <Icon path='golden-star.svg' size={12}/>
                                </span>
                            </>
                        } else {
                            roleName = row.role_details.name || '-';
                        }

                        return <div className='role'>
                            {roleName}
                        </div>
                    }
                },
                {
                    name: 'Status',
                    id: 'status',
                    visible: true,
                    render: (row) => {
                        let returnItem;

                        if (row.status === 'active') {
                            returnItem = <>Active</>
                        }
                        if (row.status === 'deactivated') {
                            returnItem = <>Deactivated</>
                        }
                        if (row.status === 'invited') {
                            returnItem = <>Invitation Pending</>
                        }

                        return <div className='user-status'>
                            {returnItem}
                        </div>
                    }
                },
                {
                    name: 'Actions',
                    id: '#',
                    visible: true,
                    render: (row) => {
                        return <div className='user-actions'>
                            {(row.status === 'deactivated') && <div className='activate-button'>
                                {<button className='button secondary-2-button'
                                    onClick={e =>{
                                        e.stopPropagation();
                                        activateUser(e, row.id);
                                    }}
                                >
                                    Activate
                                </button>}
                            </div>}

                            {(row.status === 'invited') && <div className='resend-invite-button'>
                                {<button className='button secondary-2-button'
                                    onClick={e => {
                                        e.stopPropagation();
                                        resendActivationEmail(e, row.email);
                                    }}
                                >
                                    Resend Invite
                                </button>}
                            </div>}

                            {(row.status === 'active' || row.status === 'invited') && <div className='deactivate-button'>
                                {<button className='button danger-2-button'
                                    onClick={e => {
                                        e.stopPropagation();
                                        deactivateUser(e, row.id);
                                    }}
                                >
                                    Deactivate
                                </button>}
                            </div>}
                        </div>
                    }
                },
            ]);
        // }
    }, [me]);

    useEffect(() => {
        console.log('@@Inside storage change useEffect');
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
        <div id='users-view' className='app-content listing-view'>
            <PageTopRow
                title='Users'
                type='active-listing'
                buttonText={'Add User'}
                onButtonClick={() => {
                    setUserForm(initUserForm);
                    setViewMode('edit');
                    setModalType('create');
                    toggleUserModal();
                }}
                searchAttributes={{
                    suggestionsURL: 'users',
                    suggestionData: {
                        topLeft: {
                            values: [
                            {
                                name: 'name',
                            },
                            ],
                        },
                        topRight: {
                            disableHighlight: true,
                            valuesSeperator: ', ',
                            values: [
                            {
                                name: 'role_details.name',
                                defaultValue: 'Admin',
                                disableHighlight: true,
                            },
                            ]
                        },
                    },
                    onSuggestionClick: (userId) => {
                        let user = userC.items.find(user => user.id == userId);
                        let formData = convertUserDataToForm(user);
                        setUserForm(formData);
                        setModalType('update');
                        setViewMode('read');
                        toggleUserModal();
                    },
                    onMoreButtonClick: (qParam) => {
                        let urlSearchParams = new URLSearchParams(userC.queryString);
                        console.log('On More Button Query String', userC.queryString);
                        urlSearchParams.set('q', qParam);
                        // navigate(`/vehicles${}`)
                        updateUserC({
                            queryString: urlSearchParams.toString(),
                        });
                    },
                }}
                collection={userC}
                updateCollection={updateUserC}
            />
            <div className='page-content'>
                 <Table
                    className='users-table row-link'
                    items={userC.items}
                    columns={columns}
                    controlColumns={[]}
                    loaded={userC.loaded}
                    onRowClick={onRowClick}

                    tableEmptyText='No users added'

                    collection={userC}
                    updateCollection={updateUserC}
                    reference={userRef}
                    queryString={userC.queryString}
                />
            </div>
            {userModal && <Modal title={modalType === 'create' ? 'Add New User' : 'User Details'}
                className='user-modal'
                toggleModal={toggleUserModal}
            >
                <div className='user-modal-content'>
                    <div className='name'>
                        <Input label='Name'
                            name='data.name'
                            value={userForm.data.name}
                            onChange={onUserChange}
                            error={userError['data.name']}
                            viewMode={viewMode}
                        />
                    </div>
                    <div className='email'>
                        <Input label='Email'
                            name='data.email'
                            value={userForm.data.email}
                            onChange={onUserChange}
                            error={userError['data.email']}
                            viewMode={viewMode}
                        />
                    </div>
                    <div className='role'>
                        <SelectField label='Role'
                            options={roles}
                            name='data.id_role'
                            value={userForm.data.id_role}
                            onChange={onUserChange}
                            error={userError['data.id_role']}
                            viewMode={viewMode}
                        />
                    </div>
                    <div className='action-button'>
                        {(viewMode === 'edit' && modalType === 'update')
                        && <button className='button secondary-button'
                            onClick={e => {
                                e.preventDefault();
                                setUserForm(originalFormData);
                                setViewMode('read');
                            }}
                        >
                            Cancel
                        </button>}
                        {viewMode === 'edit' && <button
                            className='button primary-button'
                            onClick={e => {
                                e.preventDefault();
                                if (modalType === 'create') {
                                    createUser();
                                } else {
                                    updateUser();
                                }
                            }}
                        >
                            {modalType === 'create' ? 'Add' : 'Update'}
                        </button>}
                        {viewMode === 'read' && <button
                            className='button primary-button user-edit-button'
                            onClick={e => {
                                e.preventDefault();
                                setViewMode('edit');
                            }}
                        >
                            Edit
                        </button>}
                    </div>
                </div>
            </Modal>}
        </div>
    </div>
}

