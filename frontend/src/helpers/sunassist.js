function getPropertyValue(selector, property) {
    return window.getComputedStyle(
        document.querySelector(selector)
    ).getPropertyValue(property)
}

// Calculate width of the bar chart based on the available space
// Used to display barchart on the details pages (vehicles, volunteers, clients, etc.)
const getDetailsPageBarChartWidth = (ref) => {
    const contentWidth = document.querySelector('.app-content.details-view').offsetWidth
    const leftPageContentWidth = document.querySelector('.left-page-content').offsetWidth
    const gap = Number(getPropertyValue('.page-content', 'column-gap').slice(0, -2))
    const sectionLeftPadding = window.getComputedStyle(
        ref.current.closest('.section')
    ).getPropertyValue('padding-left').slice(0, -2)
    const sectionRightPadding = window.getComputedStyle(
        ref.current.closest('.section')
    ).getPropertyValue('padding-right').slice(0, -2)
    const sectionSidePadding = Number(sectionLeftPadding) + Number(sectionRightPadding)

    return contentWidth
        - leftPageContentWidth
        - gap
        - sectionSidePadding
}

export {
    getDetailsPageBarChartWidth,
}
