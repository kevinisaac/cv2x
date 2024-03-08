import React, { useState, useEffect, useRef } from 'react';


export default function BarChart(props) {
    // To animate the chart once it becomes visible
    const [ isVisible, setIsVisible ] = useState(false)
    const ref = useRef()

    const singularItemText = props.singularItemText || 'item';
    const pluralItemText = props.pluralItemText || 'items';

    useEffect(() => {
        const observer = new IntersectionObserver(() => {
            setIsVisible(true);
        }, {
            rootMargin: "0px",
            threshold: 1.0,
        })

        observer.observe(ref.current)
    }, []);

    let barWidth = 30,
        borderRadius = Math.min(props.width/2, props.height/2, 8),

        // Gap is basically offset and not direct gap
        xAxisLabelGap = 20,
        yAxisLabelGap = 10,

        // Hardcoded for now so that the last label on y axis
        // doesn't go over the top
        labelYHeight = 16
    ;

    let maxDataValue = Math.max(...props.data.map(item => item.value))
    let valuesArray = []

    const labelMultiple = getLabelMultiple(maxDataValue)
    let i;
    for (i = 0; i <= maxDataValue; i += labelMultiple) {
        valuesArray.push(i)
    }
    valuesArray.push(i)
    let maxLabelValue = i

    function getLabelMultiple(num) {
        let multiple;
        let len = String(num-1).length;

        if (Number(String(num-1).charAt(0)) < 5) {
            multiple = 5 * (10 ** (len - 2))
        } else {
            multiple = 10 * (10 ** (len - 2))
        }

        return multiple
    }

    function getBarXPosition(index) {
        return props.barChartLeftPadding
            + (
                // Position of the label
                (props.barChartWidth - 0) / (props.data.length - 1)

                // So that the last bar doesn't render after the matrix
                - barWidth / (props.data.length - 1)
            ) * index
    }

    function getLabelYPosition(index) {
        return props.barChartHeight
            + props.barChartTopPadding
            - (
                // Position of the label
                props.barChartHeight / (valuesArray.length - 1)

                // So that the top most label doesn't render after the matrix
                - labelYHeight / (valuesArray.length - 1)
            ) * index
    }

    return <svg className={`bar-chart ${isVisible ? 'is-visible' : ''}`}
        ref={ref}
        width={props.barChartWidth + props.barChartLeftPadding + props.barChartRightPadding}
        height={props.barChartHeight + props.barChartTopPadding + props.barChartBottomPadding}
    >
        {props.isLoading === true
            ? <></>
            : <>
                {Object.keys(props.data).length > 0
                    ? <g className='axes-matrix'>
                        {/* X-axis */}
                        <XAxisWithLabels
                            barChartWidth={props.barChartWidth}
                            barChartHeight={props.barChartHeight}
                            barChartTopPadding={props.barChartTopPadding}
                            barChartRightPadding={props.barChartRightPadding}
                            barChartBottomPadding={props.barChartBottomPadding}
                            barChartLeftPadding={props.barChartLeftPadding}

                            data={props.data}
                            getBarXPosition={getBarXPosition}

                            xAxisLabelGap={xAxisLabelGap}
                        />

                        {/* Y-axis */}
                        <YAxisWithLabels
                            barChartWidth={props.barChartWidth}
                            barChartHeight={props.barChartHeight}
                            barChartTopPadding={props.barChartTopPadding}
                            barChartRightPadding={props.barChartRightPadding}
                            barChartBottomPadding={props.barChartBottomPadding}
                            barChartLeftPadding={props.barChartLeftPadding}

                            valuesArray={valuesArray}
                            getLabelYPosition={getLabelYPosition}

                            yAxisLabelGap={yAxisLabelGap}
                        />

                        {/* Horizontal grid lines */}
                        <g className='horizontal-grid-lines-group'>
                            {valuesArray.map((value, index) => {
                                return <HorizontalGridLine
                                    key={value}
                                    x1={props.barChartLeftPadding}
                                    y1={getLabelYPosition(index)}
                                    x2={props.barChartLeftPadding + props.barChartWidth}
                                    y2={getLabelYPosition(index)}
                                />
                            })}
                        </g>

                        {/* Bars */}
                        <g className='bar-group'>
                            {props.data.map((barData, index) => <VerticalBar
                                key={barData.key}
                                x={getBarXPosition(index)}
                                y={props.barChartHeight + props.barChartTopPadding}
                                width={barWidth}
                                height={barData.value * (
                                    (props.barChartHeight - labelYHeight) / (maxLabelValue)
                                )}
                                borderRadius={5}

                                tooltipText={
                                    barData.value
                                        ? barData.value > 1
                                            ? `${barData.value} ${pluralItemText}`
                                            : `${barData.value} ${singularItemText}`
                                        : `No ${singularItemText}`
                                }
                            />)}
                        </g>
                    </g>
                    : <g>
                        <text x='50%' y='50%'
                            text-anchor='middle'
                            className='empty-placeholder'
                        >
                            No data
                        </text>
                    </g>
                }
            </>
        }
    </svg>
}

function XAxisWithLabels(props) {
    return <>
        {/* <g className='x-axis-group'> */}
        {/*     <line className='x-axis' */}
        {/*         x1={props.barChartLeftPadding} */}
        {/*         y1={props.barChartHeight + props.barChartTopPadding} */}
        {/*         x2={props.barChartLeftPadding + props.barChartWidth} */}
        {/*         y2={props.barChartHeight + props.barChartTopPadding} */}
        {/*     /> */}
        {/* </g> */}
        <g className='x-axis-label-group'>
            {props.data.map((barData, index) => <text
                className='x-axis-label-text'
                key={barData.key}
                x={props.getBarXPosition(index)}
                y={props.barChartHeight + props.barChartTopPadding + props.xAxisLabelGap}
            >
                {barData.key}
            </text>)}
        </g>
    </>
}

function YAxisWithLabels(props) {
    return <>
        {/* <g className='y-axis-group'> */}
        {/*     <line className='y-axis' */}
        {/*         x1={props.barChartLeftPadding} */}
        {/*         y1={props.barChartHeight + props.barChartTopPadding} */}
        {/*         x2={props.barChartLeftPadding} */}
        {/*         y2={props.barChartTopPadding} */}
        {/*     /> */}
        {/* </g> */}
        <g className='y-axis-label-group'>
            {props.valuesArray.map((item, index) => <text
                className='y-axis-label-text'
                key={item}
                x={props.barChartLeftPadding - props.yAxisLabelGap}
                y={props.getLabelYPosition(index)}
            >
                {item}
            </text>)}
        </g>
    </>
}

function HorizontalGridLine(props) {
    return <line
        className='horizontal-grid-line'
        x1={props.x1}
        y1={props.y1}
        x2={props.x2}
        y2={props.y2}
        strokeDasharray='4,10'
    />
}

function HorizontalBar(props) {
    // border radius shouldn't be more than twice the thickness of the bar
    let borderRadius = Math.min(
        props.borderRadius || 0,
        props.width/2,
        props.height/2,
    )

    return <path className='horizontal-bar'
        d={`
            M0,70
            h${props.width - borderRadius},0
            q${borderRadius},0 ${borderRadius},${borderRadius}
            v0,${props.height - (2 * borderRadius)}
            q0,${borderRadius} -${borderRadius},${borderRadius}
            h-${props.width - borderRadius},0
            z
        `}
    />
}

function VerticalBar(props) {
    const [isHovered, setIsHovered] = useState(false);

    /* Bars with no value will get a small height for visuals */
    let visualHeight = props.height ? props.height : 5;

    // border radius shouldn't be more than twice the thickness of the bar
    let borderRadius = Math.min(
        props.borderRadius || 0,
        visualHeight/2,
        visualHeight/2,
    )

    let greenTop = '#80efcb';
    let greenBottom = '#46b8ca';

    let violetTop = '#bb94f6';
    let violetBottom = '#7e30f0';

    let greyTop = '#dddddd';
    let greyBottom = '#999999';

    const tooltipBorderRadius = 5,
        tooltipThornDimension = 5,  // The bottom pointer dimension
        tooltipWidth = 70,
        tooltipHeight = 20
    ;

    return <>
        <defs>
            <linearGradient id='svg-gradient-vertical'
                x1='0%'
                y1='0%'
                x2='0%'
                y2='100%'
            >
                <stop offset='0%'
                    stopColor={violetTop}
                    // stopOpacity='1'
                />
                <stop offset='100%'
                    stopColor={violetBottom}
                    // stopOpacity='1'
                />
            </linearGradient>

            <linearGradient id='svg-empty-gradient-vertical'
                x1='0%'
                y1='0%'
                x2='0%'
                y2='100%'
            >
                <stop offset='0%'
                    stopColor={greyTop}
                    // stopOpacity='1'
                />
                <stop offset='100%'
                    stopColor={greyBottom}
                    // stopOpacity='1'
                />
            </linearGradient>
        </defs>

        {/* Tooltip */}
        {isHovered && <g>
            <path className={`bar-tooltip`}
                d={`
                    M${props.x+props.width/2},${props.y-visualHeight-2}
                    l-${tooltipThornDimension},-${tooltipThornDimension}

                    l${-(tooltipWidth/2) + tooltipThornDimension + tooltipBorderRadius},0
                    q-${tooltipBorderRadius},0 -${tooltipBorderRadius},-${tooltipBorderRadius}
                    l0,${-tooltipHeight + tooltipBorderRadius*2}
                    q0,-${tooltipBorderRadius} ${tooltipBorderRadius},-${tooltipBorderRadius}

                    l${tooltipWidth - tooltipBorderRadius*2},0
                    q${tooltipBorderRadius},0 ${tooltipBorderRadius},${tooltipBorderRadius}
                    l0,${tooltipHeight - tooltipBorderRadius*2}
                    q0,${tooltipBorderRadius} -${tooltipBorderRadius},${tooltipBorderRadius}

                    l${-(tooltipWidth/2) + tooltipThornDimension + tooltipBorderRadius},0
                    z
                `}
            />
            <text className={`bar-tooltip-text`}
                x={props.x + props.width/2}
                y={props.y - visualHeight - 4 - tooltipHeight/2}
                textAnchor='middle'
                // alignBaseline='middle'
            >
                {props.tooltipText}
            </text>
        </g>}

        {/* Bar */}
        <path className={`vertical-bar ${props.height ? '' : 'empty-bar'}`}
            // fill='url(#vertical-gradient)'
            d={`
                M${props.x},${0 + props.y}
                v0,-${visualHeight - borderRadius}
                q0,-${borderRadius} ${borderRadius},-${borderRadius}
                h${props.width - (2 * borderRadius)},0
                q${borderRadius},0 ${borderRadius},${borderRadius}
                v0,${visualHeight - borderRadius}
                z
            `}
            onMouseOver={() => setIsHovered(true)}
            onMouseOut={() => setIsHovered(false)}
        />
    </>
}

