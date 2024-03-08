import { lang } from 'src';
import { isJson } from 'src/helpers'

class Service {
    constructor() {
        this.baseURL = '/api/v1/';
    }

    get(url) {
        const requestOptions = {
            method: 'GET',
        }

        return fetch(this.baseURL + url, requestOptions)
            .then(this.handleResponse);
    }


    post(url, data) {
        const requestOptions = {
            method: 'POST',
            body: JSON.stringify(data),
        }

        return fetch(this.baseURL + url, requestOptions)
            .then(this.handleResponse);
    }

    handleResponse(response) {
        return response.json()
            .then(data => {
                if (!response.ok) {
                    console.error('Network error');
                    return Promise.reject()
                }

                if (response.status >= 200 && response.status < 300) {
                    console.log('Success..', 200);
                    return data;
                } else if (response.status >= 300 && response.status < 400) {
                    console.log('Redirect..', 300);
                } else {
                    console.log('Error..', 400, 500);
                    return Promise.reject(data)
                }
            })
    }
}


// export default Service;


function _getRequestOptions(method, body=null, extraHeaders={}, fileUploadDownload=false) {
    let headers = extraHeaders;
    let requestMethod = method;
    let requestBody = null;

    if (method !== 'GET' && method !== 'DELETE') {
        if (!fileUploadDownload) {
            headers['Content-Type'] = 'application/json';
            //Below changes to accomdate BigInt
            //https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-521460510
            requestBody = body
                ? JSON.stringify(body, (key, value) => typeof(value) === 'bigint'
                    ? value.toString() : value
                )
                : null;
        } else {
            requestBody = body;
            console.log('Else RequestOptions');
        }
    }
    if (localStorage.getItem('jwt')) {
        headers['Authorization'] = `Bearer ${localStorage.getItem('jwt')}`;
    }

    return {
        method: requestMethod,
        headers: headers,
        body: requestBody,
    }
}


function _handleResponse(response, returnResponse) {
    if (returnResponse) {
        return response;
    }

    return response.text().then(text => {
        const data = text && isJson(text)
            ? JSON.parse(text)
            : {}

        if (!response.ok) {
            const error = data || response.statusText

            return Promise.reject([ response.status, error ])
        }

        return [ response.status, data ]
    })
}


function fetchWrapper(method, url, body, headers, fileUploadDownload, returnResponse=false) {
    // const navigate = useNavigate();
    const requestOptions = _getRequestOptions(method, body, headers, fileUploadDownload);

    return fetch(`/api/v1/${url}`, requestOptions)
        .then((response) => _handleResponse(response,returnResponse))
        .catch(err => {
            if (err[0] === 401) {
                localStorage.removeItem('jwt');
                window.location.assign('/login');

                return [];
            }
            console.warn('Erro', err);
            console.log('************\nFetch Wrapper Error\n************* ');
            console.error('Request options:', requestOptions);
            console.error(err.stack);
            return Promise.reject([ err[0], err[1] ])
        } )
}


const request = {
    get: (url, headers={}) => {
        return fetchWrapper('GET', url, null, headers)
    },
    post: (url, body=null, headers={}) => {
        return fetchWrapper('POST', url, body, headers)
    },
    patch: (url, body=null, headers={}) => {
        return fetchWrapper('PATCH', url, body, headers)
    },
    put: (url, body=null, headers={}) => {
        return fetchWrapper('PUT', url, body, headers)
    },
    delete: (url, body=null, headers={}) => {
        return fetchWrapper('DELETE', url, body, headers)
    },
    postFormFiles: (url, formData, headers = {}) => {
        // Merge headers with the existing headers
        // headers = { ...headers, 'Content-Type': 'multipart/form-data' };

        return fetchWrapper('POST', url, formData, headers, true);
    },
    download: (url, formData, headers = {}) => {
        return fetchWrapper('POST', url, formData, headers, true, true);
    },
}

export default request

