import React, { useRef, useEffect, useState } from "react"


export default function useElementVisibility(options={
        root: null,
        rootMargin: '0px',
        threshold: 0
    })
{
    const containerRef = useRef(null);
    const [ isVisible, setIsVisible ] = useState(false);

    const callbackFunction = (entries) => {
        const [ entry ] = entries;
        setIsVisible(entry.isIntersecting);
        // console.log(`*****************\nInside Callback ${entry.isIntersecting}  \n*****************`);
    }

    useEffect(() => {
    // console.log('*****************\nInside useEffect\n*****************');
    const observer = new IntersectionObserver(callbackFunction, options);
    if (containerRef.current) {
        // console.log('*****************\nInside Current\n*****************');
     observer.observe(containerRef.current);
    }

    return () => {
        if(containerRef.current) {
            observer.unobserve(containerRef.current)
        }
    }
    }, [ containerRef, options ]);

    return [containerRef, isVisible];
}

