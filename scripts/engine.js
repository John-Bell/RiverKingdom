
window['ai_edge_gallery_get_result'] = async (data) => {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        const nextTurn = processSeason(parsedData.state, parsedData.orders);

        // Convert the state to a string so we can pass it in the URL
        const stateString = encodeURIComponent(JSON.stringify(nextTurn.state));

        const systemStateString = JSON.stringify(nextTurn.state);

        return JSON.stringify({
            result: nextTurn.turnReport + `\n\n[HIDDEN SYSTEM STATE FOR NEXT TURN: ${systemStateString}]`,
            webview: {
                url: `webview.html?state=${stateString}`,
                aspectRatio: 1.333
            }
        });
    } catch (e) {
        return JSON.stringify({ error: e.message || e.toString() });
    }
};
