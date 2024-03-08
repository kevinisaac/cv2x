import React from 'react';


function PlacholderBox(props) {
    return <div className={`placeholder-box ${props.className || ''}`}
        style={{
            width: props.width || undefined,
            height: props.height || undefined,
        }}
    />
}

