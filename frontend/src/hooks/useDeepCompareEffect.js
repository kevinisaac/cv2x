import React, { useRef, useEffect, useState } from "react"
import { equal, } from 'src/helpers';

function useDeepCompareMemoize(value) {
    /*
     * Same effect as useEffect.
     * To be used when attributes inside objects need comparison (deep compare)
     *Reference: https://stackoverflow.com/questions/54095994/react-useeffect-comparing-objects */
    const ref = useRef();
    // it can be done by using useMemo as well
    // but useRef is rather cleaner and easier

    if (!equal(value, ref.current)) {
        ref.current = value;
    }

    return ref.current;
}

export default function useDeepCompareEffect(callback, dependencies) {
    useEffect(
        callback,
        dependencies.map(useDeepCompareMemoize)
    );
}
